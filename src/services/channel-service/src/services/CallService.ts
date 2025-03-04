import { RedisService } from './RedisService';

interface ICallParticipant {
  userId: string;
  socketId: string;
  peerId: string;
}

export class CallService {
  constructor(private readonly redisService: RedisService) {}

  private getCallKey(roomId: string): string {
    return `call:${roomId}:participants`;
  }

  async addCallParticipant(roomId: string, participant: ICallParticipant): Promise<void> {
    const key = this.getCallKey(roomId);
    await this.redisService.hSet(key, participant.userId, JSON.stringify(participant));
  }

  async removeCallParticipant(roomId: string, userId: string): Promise<void> {
    const key = this.getCallKey(roomId);
    await this.redisService.hDel(key, userId);
  }

  async getRoomParticipants(roomId: string): Promise<ICallParticipant[]> {
    const key = this.getCallKey(roomId);
    const participants = await this.redisService.hGetAll(key);
    
    return Object.values(participants).map(p => JSON.parse(p));
  }
} 