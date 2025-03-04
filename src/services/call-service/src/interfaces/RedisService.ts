export interface IRedisService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  addCallParticipant(roomId: string, userId: number): Promise<void>;
  removeCallParticipant(roomId: string, userId: number): Promise<void>;
  getCallParticipants(roomId: string): Promise<string[]>;
} 