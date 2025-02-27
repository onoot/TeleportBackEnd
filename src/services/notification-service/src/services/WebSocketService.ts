import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { 
  Notification, 
  NotificationType,
  UserStatusNotification
} from '../types/events';
import { metrics } from '../utils/metrics';

interface AuthenticatedSocket extends Socket {
  userId?: number;
}

export class WebSocketService {
  private io: SocketServer;
  private userSockets: Map<number, Set<string>> = new Map();

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST']
      }
    });
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      try {
        // Аутентификация через JWT
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
        socket.userId = decoded.id;

        // Добавляем сокет в мапу пользователя
        if (!this.userSockets.has(socket.userId)) {
          this.userSockets.set(socket.userId, new Set());
        }
        this.userSockets.get(socket.userId)!.add(socket.id);

        // Отправляем уведомление о подключении
        const statusNotification: UserStatusNotification = {
          id: uuidv4(),
          type: NotificationType.USER_STATUS_CHANGED,
          timestamp: new Date().toISOString(),
          targetUsers: [socket.userId],
          data: {
            userId: socket.userId,
            status: 'online',
            lastSeen: new Date().toISOString()
          }
        };
        this.sendToUsers([socket.userId], statusNotification);

        socket.on('disconnect', () => {
          if (socket.userId) {
            const userSockets = this.userSockets.get(socket.userId);
            if (userSockets) {
              userSockets.delete(socket.id);
              if (userSockets.size === 0) {
                this.userSockets.delete(socket.userId);
                // Отправляем уведомление об отключении
                const offlineNotification: UserStatusNotification = {
                  id: uuidv4(),
                  type: NotificationType.USER_STATUS_CHANGED,
                  timestamp: new Date().toISOString(),
                  targetUsers: [socket.userId],
                  data: {
                    userId: socket.userId,
                    status: 'offline',
                    lastSeen: new Date().toISOString()
                  }
                };
                this.sendToUsers([socket.userId], offlineNotification);
              }
            }
          }
        });
      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.disconnect();
      }
    });
  }

  public sendToUsers(userIds: number[], message: { type: string; data: any }): void {
    const endTimer = metrics.wsOperationDuration.startTimer({ operation: 'send_to_users' });
    try {
      userIds.forEach(userId => {
        const socketIds = this.userSockets.get(userId);
        if (socketIds) {
          socketIds.forEach(socketId => {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
              socket.emit('notification', message);
            }
          });
        }
      });
      metrics.wsOperations.inc({ type: 'send_to_users', status: 'success' });
    } catch (error) {
      console.error('Error sending message to users:', error);
      metrics.wsOperations.inc({ type: 'send_to_users', status: 'error' });
    } finally {
      endTimer();
    }
  }

  public getConnectedUsers(): number[] {
    return Array.from(this.userSockets.keys());
  }

  public isUserConnected(userId: number): boolean {
    return this.userSockets.has(userId);
  }

  public getUserConnectionCount(userId: number): number {
    return this.userSockets.get(userId)?.size || 0;
  }
} 