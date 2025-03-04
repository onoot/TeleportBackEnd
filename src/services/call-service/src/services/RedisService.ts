import Redis from 'ioredis';
import { IRedisService } from '../interfaces/RedisService';

export class RedisService implements IRedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    this.client.on('error', (error) => {
      console.error('Redis error:', error);
    });

    this.client.on('connect', () => {
      console.log('Successfully connected to Redis');
    });
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  public async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  public async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  public async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  public async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async addCallParticipant(roomId: string, userId: number): Promise<void> {
    await this.sadd(`call:participants:${roomId}`, userId.toString());
  }

  async removeCallParticipant(roomId: string, userId: number): Promise<void> {
    await this.srem(`call:participants:${roomId}`, userId.toString());
  }

  async getCallParticipants(roomId: string): Promise<string[]> {
    return this.smembers(`call:participants:${roomId}`);
  }
} 