import { Server as HttpServer } from 'http';
import { WebSocketService } from '../services/WebSocketService';
import { CallService } from '../services/CallService';
import { KafkaService } from '../services/KafkaService';
import { RedisService } from '../services/RedisService';
import { CallParticipant } from '../entities';
import { ParticipantStatus } from '../types';

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  targetUserId: number;
}

export class CallGateway {
  private readonly wsService: WebSocketService;

  constructor(
    httpServer: HttpServer,
    private readonly callService: CallService,
    private readonly kafkaService: KafkaService,
    private readonly redisService: RedisService
  ) {
    this.wsService = WebSocketService.getInstance(httpServer);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Обработка подключения к комнате
    this.wsService.on('call:join', async (userId: number, roomId: string) => {
      try {
        const call = await this.callService.getCallByRoomId(roomId);
        if (!call) {
          this.wsService.sendToUser(userId, {
            type: 'call:error',
            message: 'Call not found'
          });
          return;
        }

        const participant = await this.callService.addParticipant(call.id, userId);
        this.wsService.addUserToRoom(roomId, userId);

        const participants = await this.callService.getActiveParticipants(call.id);
        this.wsService.sendToUser(userId, {
          type: 'call:participants',
          participants
        });
        this.wsService.sendToRoom(roomId, {
          type: 'call:participant_joined',
          participant
        });
      } catch (error) {
        console.error('Error joining call:', error);
        this.wsService.sendToUser(userId, {
          type: 'call:error',
          message: 'Failed to join call'
        });
      }
    });

    // Обработка выхода из комнаты
    this.wsService.on('call:leave', async (userId: number, roomId: string) => {
      try {
        const call = await this.callService.getCallByRoomId(roomId);
        if (!call) return;

        const participant = await this.callService.getParticipant(call.id, userId);
        if (participant) {
          await this.callService.updateParticipantStatus(participant, ParticipantStatus.DISCONNECTED);
        }

        this.wsService.removeUserFromRoom(roomId, userId);
        this.wsService.sendToRoom(roomId, {
          type: 'call:participant_left',
          userId
        });
      } catch (error) {
        console.error('Error leaving call:', error);
      }
    });

    // Обработка WebRTC сигналов
    this.wsService.on('call:signal', async (userId: number, signal: CallSignal) => {
      try {
        this.wsService.sendToUser(signal.targetUserId, {
          type: 'call:signal',
          signal: {
            type: signal.type,
            payload: signal.payload,
            fromUserId: userId
          }
        });
      } catch (error) {
        console.error('Error sending signal:', error);
      }
    });

    // Обработка включения/выключения аудио
    this.wsService.on('call:toggle_audio', async (userId: number, roomId: string, enabled: boolean) => {
      try {
        const call = await this.callService.getCallByRoomId(roomId);
        if (!call) return;

        const participant = await this.callService.getParticipant(call.id, userId);
        if (participant) {
          await this.callService.updateParticipantAudioState(participant, enabled);
        }

        this.wsService.sendToRoom(roomId, {
          type: 'call:audio_state',
          userId,
          enabled
        });
      } catch (error) {
        console.error('Error toggling audio:', error);
      }
    });

    // Обработка включения/выключения видео
    this.wsService.on('call:toggle_video', async (userId: number, roomId: string, enabled: boolean) => {
      try {
        const call = await this.callService.getCallByRoomId(roomId);
        if (!call) return;

        const participant = await this.callService.getParticipant(call.id, userId);
        if (participant) {
          await this.callService.updateParticipantVideoState(participant, enabled);
        }

        this.wsService.sendToRoom(roomId, {
          type: 'call:video_state',
          userId,
          enabled
        });
      } catch (error) {
        console.error('Error toggling video:', error);
      }
    });

    // Обработка отключения пользователя
    this.wsService.on('user:disconnected', async (userId: number, roomId: string) => {
      try {
        const call = await this.callService.getCallByRoomId(roomId);
        if (!call) return;

        const participant = await this.callService.getParticipant(call.id, userId);
        if (participant) {
          await this.callService.updateParticipantStatus(participant, ParticipantStatus.DISCONNECTED);
        }

        this.wsService.sendToRoom(roomId, {
          type: 'call:participant_left',
          userId
        });
      } catch (error) {
        console.error('Error handling user disconnect:', error);
      }
    });
  }
} 