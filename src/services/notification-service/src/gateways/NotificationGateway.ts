import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { KafkaService } from '../services/KafkaService';
import { verify } from 'jsonwebtoken';
import { config } from '../config';

interface AuthenticatedSocket extends Socket {
  userId: number;
  username: string;
  subscriptions: Set<string>;
}

interface JwtPayload {
  id: number;
  username: string;
}

export class NotificationGateway {
  private readonly io: Server;
  private readonly userSockets: Map<number, Set<string>> = new Map();

  constructor(
    server: HttpServer,
    private kafkaService: KafkaService
  ) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      path: '/ws'
    });

    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token is required'));
        }

        // Проверка JWT токена и получение информации о пользователе
        const payload = await this.verifyToken(token) as JwtPayload;
        socket.userId = payload.id;
        socket.username = payload.username;
        socket.subscriptions = new Set();

        // Добавляем сокет в мапу пользователя
        if (!this.userSockets.has(payload.id)) {
          this.userSockets.set(payload.id, new Set());
        }
        this.userSockets.get(payload.id)?.add(socket.id);

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.username} (${socket.userId}) connected`);

      // Подписка на обновления
      socket.on('subscribe', async (serviceType: string) => {
        try {
          await this.subscribeToService(socket, serviceType);
          socket.emit('subscribed', { service: serviceType });
        } catch (error) {
          socket.emit('error', { message: 'Failed to subscribe to service' });
        }
      });

      // Отписка от обновлений
      socket.on('unsubscribe', async (serviceType: string) => {
        await this.unsubscribeFromService(socket, serviceType);
        socket.emit('unsubscribed', { service: serviceType });
      });

      // Обработка отключения
      socket.on('disconnect', async () => {
        console.log(`User ${socket.username} (${socket.userId}) disconnected`);
        
        // Удаляем сокет из мапы пользователя
        const userSockets = this.userSockets.get(socket.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.userSockets.delete(socket.userId);
          }
        }

        // Отправляем событие об отключении пользователя
        await this.kafkaService.emit('users', {
          type: 'user_status_changed',
          userId: socket.userId,
          username: socket.username,
          status: 'offline',
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  private async subscribeToService(socket: AuthenticatedSocket, serviceType: string): Promise<void> {
    const roomId = `service:${serviceType}`;
    await socket.join(roomId);
    socket.subscriptions.add(roomId);
  }

  private async unsubscribeFromService(socket: AuthenticatedSocket, serviceType: string): Promise<void> {
    const roomId = `service:${serviceType}`;
    await socket.leave(roomId);
    socket.subscriptions.delete(roomId);
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
      verify(token, config.jwt.secret, (err, decoded) => {
        if (err) reject(err);
        resolve(decoded as JwtPayload);
      });
    });
  }

  // Метод для отправки уведомлений конкретным пользователям
  public sendToUsers(userIds: number[], event: string, data: any): void {
    userIds.forEach(userId => {
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.forEach(socketId => {
          this.io.to(socketId).emit(event, data);
        });
      }
    });
  }

  // Метод для отправки уведомлений всем подписчикам сервиса
  public sendToService(serviceType: string, event: string, data: any): void {
    this.io.to(`service:${serviceType}`).emit(event, data);
  }
} 