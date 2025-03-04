import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { RedisService } from '../../services/RedisService';
import { ExtendedError } from 'socket.io/dist/namespace';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  subscriptions: Set<string>;
}

export abstract class BaseWebSocketGateway {
  protected io: SocketServer;
  protected subscriptions: Map<string, Set<string>> = new Map();

  constructor(
    protected server: HttpServer,
    protected redisService: RedisService
  ) {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware(): void {
    this.io.use((socket: Socket, next: (err?: ExtendedError) => void) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token missing'));
        }

        // Здесь должна быть проверка JWT токена
        // const decoded = jwt.verify(token, config.jwt.secret);
        // (socket as AuthenticatedSocket).userId = decoded.userId;
        
        (socket as AuthenticatedSocket).subscriptions = new Set();
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
    
    if (!this.subscriptions.has(room)) {
      this.subscriptions.set(room, new Set());
    }
    this.subscriptions.get(room)?.add(socket.userId);
  }

  protected async unsubscribeFromRoom(socket: AuthenticatedSocket, room: string): Promise<void> {
    await socket.leave(room);
    socket.subscriptions.delete(room);
    this.subscriptions.get(room)?.delete(socket.userId);
  }

  protected async getOnlineUsersInRoom(room: string): Promise<string[]> {
    return Array.from(this.subscriptions.get(room) || []);
  }

  protected async broadcastToRoom(room: string, event: string, data: any): Promise<void> {
    this.io.to(room).emit(event, data);
  }
} 