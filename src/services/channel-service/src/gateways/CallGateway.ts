import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { CallService } from '../services/CallService';
import { RedisService } from '../services/RedisService';

interface AuthenticatedSocket extends Socket {
  userId: string;
  subscriptions: Set<string>;
}

export class CallGateway {
  private readonly io: Server;
  private readonly callService: CallService;

  constructor(httpServer: HttpServer, redisService: RedisService) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });
    this.callService = new CallService(redisService);
    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware(): void {
    this.io.use((socket: Socket, next) => {
      try {
        const authSocket = socket as AuthenticatedSocket;
        const token = authSocket.handshake.auth?.token;
        
        if (!token) {
          return next(new Error('Authentication token missing'));
        }

        // Здесь должна быть реальная проверка токена
        authSocket.userId = '1'; // Замените на реальную проверку токена
        authSocket.subscriptions = new Set();
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;

      authSocket.on('call:join', async (roomId: string) => {
        try {
          await this.callService.addCallParticipant(roomId, {
            userId: authSocket.userId,
            socketId: authSocket.id,
            peerId: authSocket.id // В реальном приложении здесь должен быть ID от PeerJS
          });

          authSocket.join(roomId);
          const participants = await this.callService.getRoomParticipants(roomId);
          
          authSocket.emit('call:participants', participants);
          authSocket.to(roomId).emit('call:participant_joined', {
            userId: authSocket.userId,
            socketId: authSocket.id,
            peerId: authSocket.id
          });
        } catch (error) {
          console.error('Error joining call:', error);
          authSocket.emit('call:error', { message: 'Failed to join call' });
        }
      });

      authSocket.on('call:leave', async (roomId: string) => {
        try {
          await this.callService.removeCallParticipant(roomId, authSocket.userId);
          authSocket.leave(roomId);
          authSocket.to(roomId).emit('call:participant_left', authSocket.userId);
        } catch (error) {
          console.error('Error leaving call:', error);
        }
      });

      authSocket.on('call:signal', async (data: { targetUserId: string; type: string; payload: any }) => {
        try {
          const targetSocket = this.io.sockets.sockets.get(data.targetUserId) as AuthenticatedSocket;
          if (targetSocket) {
            targetSocket.emit('call:signal', {
              type: data.type,
              payload: data.payload,
              fromUserId: authSocket.userId
            });
          }
        } catch (error) {
          console.error('Error sending signal:', error);
        }
      });

      authSocket.on('disconnect', async () => {
        try {
          // Находим все комнаты, в которых был пользователь
          const rooms = Array.from(authSocket.rooms);
          for (const roomId of rooms) {
            if (roomId !== authSocket.id) { // socket.id тоже является комнатой
              await this.callService.removeCallParticipant(roomId, authSocket.userId);
              authSocket.to(roomId).emit('call:participant_left', authSocket.userId);
            }
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });
    });
  }
} 