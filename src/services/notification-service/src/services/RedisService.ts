import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { Notification } from '../types/events';
import { metrics } from '../utils/metrics';

const NOTIFICATION_TTL = 7 * 24 * 60 * 60; // 7 дней
const CHANNEL_ACCESS_TTL = 24 * 60 * 60; // 1 день
const ROOM_PARTICIPANTS_TTL = 60 * 60; // 1 час

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });

    this.client.on('error', (error) => {
      console.error('Redis error:', error);
      metrics.redisOperations.inc({ type: 'error', status: 'error' });
    });
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.ping();
      console.log('Connected to Redis');
    } catch (error) {
      console.error('Error connecting to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      console.log('Disconnected from Redis');
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  async saveNotification(notification: Notification): Promise<void> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'saveNotification', status: 'start' });
    try {
      const key = `notifications:${notification.targetUsers.join(':')}`;
      const value = JSON.stringify(notification);

      await this.client
        .multi()
        .lpush(key, value)
        .ltrim(key, 0, 99)
        .expire(key, NOTIFICATION_TTL)
        .exec();

      metrics.redisOperations.inc({ type: 'saveNotification', status: 'success' });
    } catch (error) {
      console.error('Error saving notification:', error);
      metrics.redisOperations.inc({ type: 'saveNotification', status: 'error' });
      throw error;
    } finally {
      endTimer();
    }
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'getNotifications', status: 'start' });
    try {
      const key = `notifications:${userId}`;
      const notifications = await this.client.lrange(key, 0, -1);
      
      metrics.redisOperations.inc({ type: 'getNotifications', status: 'success' });
      return notifications.map(n => JSON.parse(n));
    } catch (error) {
      console.error('Error getting notifications:', error);
      metrics.redisOperations.inc({ type: 'getNotifications', status: 'error' });
      return [];
    } finally {
      endTimer();
    }
  }

  async checkChannelAccess(userId: number, channelId: number): Promise<boolean> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'checkChannelAccess', status: 'start' });
    try {
      const key = `channel:${channelId}:members`;
      const isMember = await this.client.sismember(key, userId.toString());
      
      metrics.redisOperations.inc({ type: 'checkChannelAccess', status: 'success' });
      return isMember === 1;
    } catch (error) {
      console.error('Error checking channel access:', error);
      metrics.redisOperations.inc({ type: 'checkChannelAccess', status: 'error' });
      return false;
    } finally {
      endTimer();
    }
  }

  async setChannelAccess(channelId: number, userIds: number[]): Promise<void> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'setChannelAccess', status: 'start' });
    try {
      const key = `channel:${channelId}:members`;
      await this.client
        .multi()
        .del(key)
        .sadd(key, ...userIds.map(id => id.toString()))
        .expire(key, CHANNEL_ACCESS_TTL)
        .exec();
      
      metrics.redisOperations.inc({ type: 'setChannelAccess', status: 'success' });
    } catch (error) {
      console.error('Error setting channel access:', error);
      metrics.redisOperations.inc({ type: 'setChannelAccess', status: 'error' });
      throw error;
    } finally {
      endTimer();
    }
  }

  async getChannelParticipants(channelId: number): Promise<number[]> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'getChannelParticipants', status: 'start' });
    try {
      const key = `channel:${channelId}:members`;
      const members = await this.client.smembers(key);
      
      metrics.redisOperations.inc({ type: 'getChannelParticipants', status: 'success' });
      return members.map(m => parseInt(m));
    } catch (error) {
      console.error('Error getting channel participants:', error);
      metrics.redisOperations.inc({ type: 'getChannelParticipants', status: 'error' });
      return [];
    } finally {
      endTimer();
    }
  }

  async addUserToRoom(roomId: string, userId: number): Promise<void> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'addUserToRoom', status: 'start' });
    try {
      const key = `room:${roomId}:participants`;
      await this.client
        .multi()
        .sadd(key, userId.toString())
        .expire(key, ROOM_PARTICIPANTS_TTL)
        .exec();
      
      metrics.redisOperations.inc({ type: 'addUserToRoom', status: 'success' });
    } catch (error) {
      console.error('Error adding user to room:', error);
      metrics.redisOperations.inc({ type: 'addUserToRoom', status: 'error' });
      throw error;
    } finally {
      endTimer();
    }
  }

  async removeUserFromRoom(roomId: string, userId: number): Promise<void> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'removeUserFromRoom', status: 'start' });
    try {
      const key = `room:${roomId}:participants`;
      await this.client.srem(key, userId.toString());
      
      metrics.redisOperations.inc({ type: 'removeUserFromRoom', status: 'success' });
    } catch (error) {
      console.error('Error removing user from room:', error);
      metrics.redisOperations.inc({ type: 'removeUserFromRoom', status: 'error' });
      throw error;
    } finally {
      endTimer();
    }
  }

  async getRoomParticipants(roomId: string): Promise<number[]> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'getRoomParticipants', status: 'start' });
    try {
      const key = `room:${roomId}:participants`;
      const participants = await this.client.smembers(key);
      
      metrics.redisOperations.inc({ type: 'getRoomParticipants', status: 'success' });
      return participants.map(p => parseInt(p));
    } catch (error) {
      console.error('Error getting room participants:', error);
      metrics.redisOperations.inc({ type: 'getRoomParticipants', status: 'error' });
      return [];
    } finally {
      endTimer();
    }
  }

  async getServerMembers(serverId: number): Promise<number[]> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'getServerMembers', status: 'start' });
    try {
      const key = `server:${serverId}:members`;
      const members = await this.client.smembers(key);
      
      metrics.redisOperations.inc({ type: 'getServerMembers', status: 'success' });
      return members.map(m => parseInt(m));
    } catch (error) {
      console.error('Error getting server members:', error);
      metrics.redisOperations.inc({ type: 'getServerMembers', status: 'error' });
      return [];
    } finally {
      endTimer();
    }
  }

  async updateServerMembers(serverId: number, members: number[]): Promise<void> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'updateServerMembers', status: 'start' });
    try {
      const key = `server:${serverId}:members`;
      await this.client.sadd(key, ...members.map(m => m.toString()));
      metrics.redisOperations.inc({ type: 'updateServerMembers', status: 'success' });
    } catch (error) {
      console.error('Error updating server members:', error);
      metrics.redisOperations.inc({ type: 'updateServerMembers', status: 'error' });
    } finally {
      endTimer();
    }
  }

  async getUserNotifications(userId: number, limit: number = 50): Promise<Notification[]> {
    const endTimer = metrics.redisOperationDuration.startTimer({ type: 'getUserNotifications', status: 'start' });
    try {
      const key = `notifications:user:${userId}`;
      const notifications = await this.client.lrange(key, 0, limit - 1);
      
      metrics.redisOperations.inc({ type: 'getUserNotifications', status: 'success' });
      return notifications.map(n => JSON.parse(n));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      metrics.redisOperations.inc({ type: 'getUserNotifications', status: 'error' });
      return [];
    } finally {
      endTimer();
    }
  }

  // Заглушка для получения членов сервера из базы данных
  private async fetchServerMembersFromDB(serverId: number): Promise<number[]> {
    // TODO: Реализовать получение данных из базы
    return [];
  }
} 