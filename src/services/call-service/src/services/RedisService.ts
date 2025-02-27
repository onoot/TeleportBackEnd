import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async addCallParticipant(roomId: string, userId: number): Promise<void> {
    await this.redis.sadd(`call:participants:${roomId}`, userId.toString());
  }

  async removeCallParticipant(roomId: string, userId: number): Promise<void> {
    await this.redis.srem(`call:participants:${roomId}`, userId.toString());
  }

  async getCallParticipants(roomId: string): Promise<string[]> {
    return this.redis.smembers(`call:participants:${roomId}`);
  }
} 