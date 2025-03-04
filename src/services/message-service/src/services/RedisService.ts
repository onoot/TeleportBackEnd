import Redis from 'ioredis';
import { config } from '../config';

export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password
    });
  }

  async addActiveUser(channelId: string, userId: string): Promise<void> {
    const key = `channel:${channelId}:active_users`;
    await this.client.sadd(key, userId);
  }

  async removeActiveUser(channelId: string, userId: string): Promise<void> {
    const key = `channel:${channelId}:active_users`;
    await this.client.srem(key, userId);
  }

  async getActiveUsers(channelId: string): Promise<string[]> {
    const key = `channel:${channelId}:active_users`;
    return await this.client.smembers(key);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
} 