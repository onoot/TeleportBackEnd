import { Server as HttpServer } from 'http';
import { Socket } from 'socket.io';
import { BaseWebSocketGateway, AuthenticatedSocket } from '@shared/websocket/BaseWebSocketGateway';
import { CallService } from '../services/CallService';
import { KafkaService } from '../services/KafkaService';
import { RedisService } from '../services/RedisService';

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  targetUserId: number;
}

export class CallGateway extends BaseWebSocketGateway {
  constructor(
    server: HttpServer,
    redisService: RedisService,
    private callService: CallService,
    private kafkaService: KafkaService
  ) {
    super(server, redisService);
  }

  protected setupHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      socket.on('join_call', async (roomId: string) => {
        try {
          // Проверяем права доступа и статус комнаты
          const room = await this.callService.getRoomById(roomId);
          if (!room) {
            throw new Error('Room not found');
          }
          
          await this.callService.checkAccess(socket.userId, roomId);
          
          // Подписываем на комнату
          await this.subscribeToRoom(socket, `call:${roomId}`);
          
          // Обновляем статус участника
          await this.callService.addParticipant(roomId, socket.userId);
          
          // Получаем текущих участников
          const participants = await this.callService.getRoomParticipants(roomId);
          
          // Отправляем информацию о комнате
          socket.emit('call_joined', {
            roomId,
            participants
          });
          
          // Уведомляем других участников
          socket.broadcast.to(`call:${roomId}`).emit('participant_joined', {
            userId: socket.userId,
            timestamp: new Date().toISOString()
          });
          
          // Сохраняем в Redis для быстрого доступа
          await this.redisService.addCallParticipant(roomId, socket.userId);
        } catch (error) {
          socket.emit('error', { message: 'Failed to join call' });
        }
      });

      socket.on('leave_call', async (roomId: string) => {
        await this.handleCallLeave(socket, roomId);
      });

      socket.on('signal', async (data: CallSignal) => {
        try {
          const { targetUserId, type, payload } = data;
          const targetSocket = await this.findUserSocket(targetUserId);
          
          if (targetSocket) {
            targetSocket.emit('signal', {
              type,
              payload,
              fromUserId: socket.userId
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to send signal' });
        }
      });

      socket.on('mute_audio', async (roomId: string, muted: boolean) => {
        await this.broadcastToRoom(`call:${roomId}`, 'participant_audio_changed', {
          userId: socket.userId,
          muted
        });
        await this.callService.updateParticipantAudio(roomId, socket.userId, !muted);
      });

      socket.on('mute_video', async (roomId: string, muted: boolean) => {
        await this.broadcastToRoom(`call:${roomId}`, 'participant_video_changed', {
          userId: socket.userId,
          muted
        });
        await this.callService.updateParticipantVideo(roomId, socket.userId, !muted);
      });

      socket.on('disconnect', async () => {
        // Обрабатываем выход из всех звонков
        for (const sub of socket.subscriptions) {
          if (sub.startsWith('call:')) {
            const roomId = sub.split(':')[1];
            await this.handleCallLeave(socket, roomId);
          }
        }
      });
    });
  }

  private async handleCallLeave(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      await this.unsubscribeFromRoom(socket, `call:${roomId}`);
      await this.callService.removeParticipant(roomId, socket.userId);
      await this.redisService.removeCallParticipant(roomId, socket.userId);

      // Уведомляем остальных участников
      await this.broadcastToRoom(`call:${roomId}`, 'participant_left', {
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });

      // Проверяем, остались ли участники
      const participants = await this.callService.getRoomParticipants(roomId);
      if (participants.length === 0) {
        await this.callService.endCall(roomId);
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to leave call' });
    }
  }

  private async findUserSocket(userId: number): Promise<AuthenticatedSocket | null> {
    const sockets = await this.io.fetchSockets();
    return sockets.find(socket => (socket as AuthenticatedSocket).userId === userId) as AuthenticatedSocket || null;
  }
} 