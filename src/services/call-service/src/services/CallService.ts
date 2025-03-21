import { Repository, DataSource, IsNull } from 'typeorm';
import { Call, CallParticipant } from '../entities';
import { CallStatus, CallType, ParticipantStatus, SignalingMessage } from '../types';
import { kafkaProducer } from '../kafka/producer';
import { WebSocketService } from './WebSocketService';
import { AppDataSource } from '../data-source';
import { RoomService } from './RoomService';
import { CallModel } from '../models/CallModel';
import { RedisService } from './RedisService';
import { KafkaService } from './KafkaService';
import { Router } from 'express';
import { Socket } from 'socket.io';
import { IRedisService } from '../interfaces/RedisService';

interface CallRoom {
  id: string;
  createdAt: string;
  participants: Array<{
    userId: number;
    audioEnabled: boolean;
    videoEnabled: boolean;
    joinedAt: string;
  }>;
}

export class CallService {
  private callRepository = AppDataSource.getRepository(Call);
  private participantRepository = AppDataSource.getRepository(CallParticipant);
  private readonly callModel: CallModel;
  private webSocketService?: WebSocketService;
  public router: Router;

  constructor(
    private readonly redisService: IRedisService,
    private readonly kafkaService: KafkaService
  ) {
    this.callModel = new CallModel(AppDataSource);
    this.router = Router();
    this.initializeRoutes();
  }

  public setWebSocketService(webSocketService: WebSocketService): void {
    this.webSocketService = webSocketService;
  }

  private async checkActiveCall(userId: number): Promise<void> {
    try {
      const activeParticipant = await this.participantRepository
        .createQueryBuilder('participant')
        .innerJoin('participant.call', 'call')
        .where('participant.user_id = :userId', { userId })
        .andWhere('participant.status = :status', { status: ParticipantStatus.CONNECTED })
        .andWhere('call.status IN (:...statuses)', { 
          statuses: [CallStatus.INITIATED, CallStatus.CONNECTED] 
        })
        .getOne();

      if (activeParticipant) {
        throw new Error('У пользователя уже есть активный звонок');
      }
    } catch (error) {
      console.error('Error checking active call:', error);
      throw error;
    }
  }

  async isUserInCall(userId: number): Promise<boolean> {
    const participant = await this.callModel.getCallParticipantByUserId(userId);
    return participant !== null;
  }

  async createCall(roomId: string, initiatorId: number, type: CallType = CallType.AUDIO): Promise<Call> {
    const call = await this.callModel.createCall(roomId, initiatorId, type);
    return call;
  }

  async addParticipant(callId: string, userId: number, type: CallType = CallType.AUDIO): Promise<CallParticipant> {
    const participant = await this.callModel.createCallParticipant(callId, userId, ParticipantStatus.INVITED, type);
    return participant;
  }

  async getCallById(callId: string): Promise<Call | null> {
    return this.callModel.getCallById(callId);
  }

  async getCallByRoomId(roomId: string): Promise<Call | null> {
    return this.callRepository.findOne({
      where: { room_id: roomId }
    });
  }

  async getParticipant(callId: string, userId: number): Promise<CallParticipant | null> {
    return this.participantRepository.findOne({
      where: { call_id: callId, user_id: userId }
    });
  }

  async updateParticipantStatus(participant: CallParticipant, status: ParticipantStatus): Promise<CallParticipant> {
    participant.status = status;
    if (status === ParticipantStatus.CONNECTED) {
      participant.joined_at = new Date();
    } else if (status === ParticipantStatus.DISCONNECTED) {
      participant.left_at = new Date();
    }
    return this.callModel.updateCallParticipant(participant);
  }

  async updateParticipantAudioState(participant: CallParticipant, enabled: boolean): Promise<CallParticipant> {
    participant.audio_enabled = enabled;
    return this.participantRepository.save(participant);
  }

  async updateParticipantVideoState(participant: CallParticipant, enabled: boolean): Promise<CallParticipant> {
    participant.video_enabled = enabled;
    return this.participantRepository.save(participant);
  }

  async updateCallStatus(call: Call, status: CallStatus): Promise<Call> {
    call.status = status;
    if (status === CallStatus.CONNECTED) {
      call.start_time = new Date();
    } else if (status === CallStatus.ENDED) {
      call.end_time = new Date();
      if (call.start_time) {
        call.duration = Math.floor((call.end_time.getTime() - call.start_time.getTime()) / 1000);
      }
    }
    return this.callModel.updateCall(call);
  }

  async getActiveParticipants(callId: string): Promise<CallParticipant[]> {
    return this.participantRepository.find({
      where: {
        call_id: callId,
        status: ParticipantStatus.CONNECTED
      }
    });
  }

  async endCall(callId: string): Promise<void> {
    const call = await this.getCallById(callId);
    if (!call) return;

    const participants = await this.getActiveParticipants(callId);
    for (const participant of participants) {
      await this.updateParticipantStatus(participant, ParticipantStatus.DISCONNECTED);
    }

    await this.updateCallStatus(call, CallStatus.ENDED);
  }

  async findCallById(callId: string): Promise<Call | null> {
    console.log('Finding call by id:', callId);
    try {
      const call = await this.callRepository.findOne({
        where: { id: callId }
      });
      console.log('Found call:', call);
      return call;
    } catch (error) {
      console.error('Error finding call:', error);
      return null;
    }
  }

  async findCallByRoomId(roomId: string): Promise<Call | null> {
    console.log('Finding call by room id:', roomId);
    try {
      const call = await this.callRepository.findOne({
        where: { room_id: roomId }
      });
      console.log('Found call:', call);
      return call;
    } catch (error) {
      console.error('Error finding call:', error);
      return null;
    }
  }

  async acceptCall(callId: string, userId: number): Promise<Call> {
    const call = await this.findCallById(callId);
    if (!call) {
      throw new Error('Звонок не найден');
    }

    const participant = await this.participantRepository.findOne({
      where: { call_id: callId, user_id: userId }
    });

    if (!participant) {
      throw new Error('Пользователь не является участником звонка');
    }

    if (participant.status !== ParticipantStatus.INVITED) {
      throw new Error('Невозможно принять звонок в текущем статусе');
    }

    participant.status = ParticipantStatus.CONNECTED;
    participant.joined_at = new Date();
    await this.participantRepository.save(participant);

    call.status = CallStatus.CONNECTED;
    call.start_time = new Date();
    call.updated_at = new Date();
    await this.callRepository.save(call);

    return call;
  }

  async rejectCall(callId: string, userId: number): Promise<Call> {
    const call = await this.findCallById(callId);
    if (!call) {
      throw new Error('Звонок не найден');
    }

    if (call.status !== CallStatus.INITIATED) {
      throw new Error('Невозможно отклонить звонок в текущем статусе');
    }

    call.status = CallStatus.REJECTED;
    call.end_time = new Date();
    call.updated_at = new Date();
    await this.callRepository.save(call);

    return call;
  }

  async updateParticipantType(callId: string, userId: number, type: CallType): Promise<CallParticipant> {
    const call = await this.findCallById(callId);
    if (!call) {
      throw new Error('Звонок не найден');
    }

    const participant = await this.participantRepository.findOne({
      where: { call_id: callId, user_id: userId }
    });

    if (!participant) {
      throw new Error('Участник не найден');
    }

    participant.call_type = type;
    participant.updated_at = new Date();
    await this.participantRepository.save(participant);

    // Отправляем событие в Kafka
    await kafkaProducer.sendMessage('calls', {
      topic: 'calls',
      messages: [{
        value: JSON.stringify({
          type: 'call_type_changed',
          recipients: [],
          data: {
            call_id: callId,
            room_id: call.room_id,
            user_id: userId,
            call_type: type
          }
        })
      }]
    });

    return participant;
  }

  async sendSignal(callId: string, userId: number, signal: SignalingMessage): Promise<void> {
    const call = await this.findCallById(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    // Проверяем, что пользователь является участником звонка
    const participant = await this.findParticipant(callId, userId);
    if (!participant) {
      throw new Error('User is not a participant of this call');
    }

    // Проверяем, что целевой пользователь тоже является участником
    const targetParticipant = await this.findParticipant(callId, signal.to);
    if (!targetParticipant) {
      throw new Error('Target user is not a participant of this call');
    }

    // Отправляем сигнал через WebSocket, если пользователь онлайн
    if (this.webSocketService?.isUserInRoom(call.room_id, signal.to)) {
      this.webSocketService.sendToUser(signal.to, {
        type: 'signal',
        data: {
          type: signal.type,
          payload: signal.payload,
          from: signal.from,
          callId: callId
        }
      });

      // Отправляем событие в Kafka для логирования
      await kafkaProducer.sendMessage('calls', {
        type: 'signal',
        callId: callId,
        from: signal.from,
        to: signal.to,
        signalType: signal.type,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Target user is not online');
    }
  }

  async joinCall(roomId: string, userId: number, type: CallType): Promise<Call> {
    // Проверяем, нет ли уже активного звонка в комнате
    const existingCall = await this.findCallByRoomId(roomId);
    if (existingCall) {
      // Если звонок существует, добавляем пользователя как участника
      const participant = await this.addParticipant(existingCall.id, userId, type);
      
      // Отправляем событие в Kafka
      await kafkaProducer.sendMessage('calls', {
        type: 'participant_joined',
        callId: existingCall.id,
        userId: userId,
        roomId: roomId,
        callType: type,
        timestamp: new Date().toISOString()
      });

      return existingCall;
    }

    // Если звонка нет, создаем новый
    const call = await this.createCall(roomId, userId, type);

    // Отправляем событие в Kafka
    await kafkaProducer.sendMessage('calls', {
      type: 'call_started',
      callId: call.id,
      initiatorId: userId,
      roomId: roomId,
      callType: type,
      timestamp: new Date().toISOString()
    });

    return call;
  }

  async getActiveCall(userId: number): Promise<Call | null> {
    const participant = await this.participantRepository
      .createQueryBuilder('participant')
      .innerJoinAndSelect('participant.call', 'call')
      .where('participant.user_id = :userId', { userId })
      .andWhere('participant.status = :status', { status: ParticipantStatus.CONNECTED })
      .andWhere('call.status IN (:...statuses)', { 
        statuses: [CallStatus.INITIATED, CallStatus.CONNECTED] 
      })
      .getOne();

    return participant?.call || null;
  }

  async getCallParticipants(callId: string): Promise<CallParticipant[]> {
    return await this.participantRepository.find({
      where: { 
        call_id: callId,
        status: ParticipantStatus.CONNECTED
      }
    });
  }

  async findActiveCall(userId: number): Promise<Call | null> {
    const participant = await this.participantRepository.findOne({
      where: {
        user_id: userId,
        status: ParticipantStatus.CONNECTED
      },
      relations: ['call']
    });
    return participant?.call || null;
  }

  async findCallParticipants(callId: string): Promise<CallParticipant[]> {
    return await this.participantRepository.find({
      where: { call_id: callId }
    });
  }

  async findParticipant(callId: string, userId: number): Promise<CallParticipant | null> {
    return await this.participantRepository.findOne({
      where: {
        call_id: callId,
        user_id: userId
      }
    });
  }

  async getRoomById(roomId: string): Promise<CallRoom | null> {
    const room = await this.redisService.get(`call:room:${roomId}`);
    return room ? JSON.parse(room) : null;
  }

  async checkAccess(userId: number, roomId: string): Promise<boolean> {
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Здесь можно добавить дополнительные проверки прав доступа
    return true;
  }

  async addParticipantToCall(callId: string, userId: number, type: CallType = CallType.AUDIO): Promise<CallParticipant> {
    const participant = await this.callModel.createCallParticipant(callId, userId, ParticipantStatus.INVITED, type);
    return participant;
  }

  async addParticipantToRoom(roomId: string, userId: number): Promise<void> {
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    await this.redisService.addCallParticipant(roomId, userId);

    await this.kafkaService.produce('call-events', {
      type: 'participant_joined',
      roomId,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  async endCallById(callId: string): Promise<void> {
    const call = await this.getCallById(callId);
    if (!call) return;

    call.status = CallStatus.ENDED;
    call.endedAt = new Date();
    await this.callRepository.save(call);

    await this.kafkaService.produce('call-events', {
      type: 'call_ended',
      callId,
      timestamp: new Date().toISOString()
    });
  }

  async endCallByRoomId(roomId: string): Promise<void> {
    await this.redisService.del(`call:room:${roomId}`);
    
    await this.kafkaService.produce('call-events', {
      type: 'call_ended',
      roomId,
      timestamp: new Date().toISOString()
    });
  }

  private initializeRoutes() {
    this.router.post('/join', this.handleJoinCall.bind(this));
    this.router.post('/leave', this.handleLeaveCall.bind(this));
    this.router.get('/:callId/participants', this.getParticipants.bind(this));
  }

  public handleConnection(socket: Socket) {
    console.log('Client connected:', socket.id);

    socket.on('join-call', async (data) => {
      const { callId, userId } = data;
      await this.redisService.sadd(`call:${callId}:participants`, userId);
      socket.join(`call:${callId}`);
      socket.to(`call:${callId}`).emit('user-joined', { userId });
      
      await this.kafkaService.produce('call-events', {
        type: 'USER_JOINED_CALL',
        data: { callId, userId }
      });
    });

    socket.on('leave-call', async (data) => {
      const { callId, userId } = data;
      await this.redisService.srem(`call:${callId}:participants`, userId);
      socket.leave(`call:${callId}`);
      socket.to(`call:${callId}`).emit('user-left', { userId });
      
      await this.kafkaService.produce('call-events', {
        type: 'USER_LEFT_CALL',
        data: { callId, userId }
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  }

  private async handleJoinCall(req: any, res: any) {
    try {
      const { callId, userId } = req.body;
      await this.redisService.sadd(`call:${callId}:participants`, userId);
      
      await this.kafkaService.produce('call-events', {
        type: 'USER_JOINED_CALL',
        data: { callId, userId }
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error joining call:', error);
      res.status(500).json({ error: 'Failed to join call' });
    }
  }

  private async handleLeaveCall(req: any, res: any) {
    try {
      const { callId, userId } = req.body;
      await this.redisService.srem(`call:${callId}:participants`, userId);
      
      await this.kafkaService.produce('call-events', {
        type: 'USER_LEFT_CALL',
        data: { callId, userId }
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error leaving call:', error);
      res.status(500).json({ error: 'Failed to leave call' });
    }
  }

  private async getParticipants(req: any, res: any) {
    try {
      const { callId } = req.params;
      const participants = await this.redisService.smembers(`call:${callId}:participants`);
      res.status(200).json({ participants });
    } catch (error) {
      console.error('Error getting participants:', error);
      res.status(500).json({ error: 'Failed to get participants' });
    }
  }

  async generateInvite(callId: string, userId: number): Promise<{ invite_code: string }> {
    const call = await this.getCallById(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    // Проверяем, является ли пользователь участником звонка
    const participant = await this.findParticipant(callId, userId);
    if (!participant) {
      throw new Error('User is not a participant of this call');
    }

    // Генерируем уникальный код приглашения
    const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Сохраняем код приглашения в Redis с временем жизни 24 часа
    await this.redisService.set(`invite:${inviteCode}`, callId, 86400);

    return { invite_code: inviteCode };
  }
} 