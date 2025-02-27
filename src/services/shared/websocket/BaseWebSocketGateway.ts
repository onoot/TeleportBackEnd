import { Server as HttpServer } from 'http';
import { Server, Socket, RemoteSocket, DefaultEventsMap } from 'socket.io';
import { NextFunction } from 'express';
import { IRedisService } from '../interfaces/RedisService';

export interface AuthenticatedSocket extends Socket {
  userId: number;
  subscriptions: Set<string>;
}

export abstract class BaseWebSocketGateway {
  protected readonly io: Server;
  protected readonly redisService: IRedisService;

  constructor(server: HttpServer, redisService: IRedisService) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });
    this.redisService = redisService;

    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware(): void {
    this.io.use((socket: Socket, next: NextFunction) => {
      try {
        const authSocket = socket as AuthenticatedSocket;
        const token = authSocket.handshake.auth?.token;
        
        if (!token) {
          return next(new Error('Authentication token missing'));
        }

        // Здесь должна быть реальная проверка токена
        authSocket.userId = 1; // Замените на реальную проверку токена
        authSocket.subscriptions = new Set();
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  protected abstract setupHandlers(): void;

  protected async subscribeToRoom(socket: AuthenticatedSocket, room: string): Promise<void> {
    await socket.join(room);
    socket.subscriptions.add(room);
  }

  protected async unsubscribeFromRoom(socket: AuthenticatedSocket, room: string): Promise<void> {
    await socket.leave(room);
    socket.subscriptions.delete(room);
  }

  protected async broadcastToRoom(room: string, event: string, data: any): Promise<void> {
    this.io.to(room).emit(event, data);
  }

  protected async getSocketsInRoom(room: string): Promise<RemoteSocket<DefaultEventsMap, any>[]> {
    return this.io.in(room).fetchSockets();
  }
} 