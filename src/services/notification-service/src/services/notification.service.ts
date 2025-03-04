import { Consumer } from 'kafkajs';
import { Server } from 'socket.io';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { NotificationStore } from './notification.store';
import { NotificationType, Notification, MessageNotificationData, CallNotificationData, ChannelNotificationData, FriendRequestNotificationData, NotificationData } from '../types/notification.types';
import { verifyToken } from '../middleware/auth';
import { Redis } from 'ioredis';
import webpush from 'web-push';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  private redis: Redis;
  private io: Server;
  private connectedUsers: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(
    private consumer: Consumer,
    io: Server,
    private notificationStore: NotificationStore
  ) {
    this.redis = new Redis(config.redis);
    this.io = io;

    if (config.pushNotifications.enabled) {
      webpush.setVapidDetails(
        config.pushNotifications.webPush.subject,
        config.pushNotifications.webPush.publicKey,
        config.pushNotifications.webPush.privateKey
      );
    }

    this.setupWebSocket();
  }

  async start(): Promise<void> {
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message.value) {
            logger.warn('Received empty message');
            return;
          }
          
          try {
            const notification = JSON.parse(message.value.toString());
            logger.info(`Received notification from topic ${topic}:`, notification);
            
            await this.processNotification(topic, notification);
          } catch (error) {
            logger.error(`Error processing message from topic ${topic}:`, error);
          }
        }
      });
    } catch (error) {
      logger.error('Error starting notification service:', error);
      throw error;
    }
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('authenticate', (userId: string) => {
        // Добавляем сокет в комнату пользователя
        socket.join(`user:${userId}`);
        
        // Сохраняем информацию о подключенном сокете
        const userSockets = this.connectedUsers.get(userId) || [];
        userSockets.push(socket.id);
        this.connectedUsers.set(userId, userSockets);

        console.log(`User ${userId} authenticated on socket ${socket.id}`);
      });

      socket.on('disconnect', () => {
        // Удаляем информацию о отключенном сокете
        for (const [userId, sockets] of this.connectedUsers.entries()) {
          const index = sockets.indexOf(socket.id);
          if (index !== -1) {
            sockets.splice(index, 1);
            if (sockets.length === 0) {
              this.connectedUsers.delete(userId);
            } else {
              this.connectedUsers.set(userId, sockets);
            }
          }
        }
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private async processNotification(topic: string, data: any): Promise<void> {
    try {
      let notification: Notification;

      switch (topic) {
        case 'messages':
          notification = this.createMessageNotification(data);
          break;
        case 'calls':
          notification = this.createCallNotification(data);
          break;
        case 'channels':
          notification = this.createChannelNotification(data);
          break;
        case 'friend-requests':
          notification = this.createFriendRequestNotification(data);
          break;
        default:
          logger.warn(`Unknown topic: ${topic}`);
          return;
      }

      await this.notificationStore.addNotification(notification);
      await this.sendNotification(notification, [notification.userId]);
    } catch (error) {
      logger.error(`Error processing notification for topic ${topic}:`, error);
    }
  }

  private createMessageNotification(data: MessageNotificationData): Notification {
    return {
      id: randomUUID(),
      type: NotificationType.NEW_MESSAGE,
      userId: data.recipientId,
      createdAt: new Date(),
      isRead: false,
      data: {
        messageId: data.messageId,
        senderId: data.senderId,
        content: data.content,
        channelId: data.channelId,
        serverId: data.serverId,
        recipientId: data.recipientId
      }
    };
  }

  private createCallNotification(data: CallNotificationData): Notification {
    return {
      id: randomUUID(),
      type: data.action === 'started' ? NotificationType.CALL_STARTED : NotificationType.CALL_ENDED,
      userId: data.recipientId,
      createdAt: new Date(),
      isRead: false,
      data: {
        callId: data.callId,
        callerId: data.callerId,
        channelId: data.channelId,
        serverId: data.serverId,
        recipientId: data.recipientId,
        action: data.action
      }
    };
  }

  private createChannelNotification(data: ChannelNotificationData): Notification {
    return {
      id: randomUUID(),
      type: NotificationType.CHANNEL_CREATED,
      userId: data.userId,
      createdAt: new Date(),
      isRead: false,
      data: {
        channelId: data.channelId,
        serverId: data.serverId,
        channelName: data.channelName,
        userId: data.userId
      }
    };
  }

  private createFriendRequestNotification(data: FriendRequestNotificationData): Notification {
    return {
      id: randomUUID(),
      type: NotificationType.FRIEND_REQUEST,
      userId: data.recipientId,
      createdAt: new Date(),
      isRead: false,
      data: {
        requestId: data.requestId,
        senderId: data.senderId,
        senderUsername: data.senderUsername,
        recipientId: data.recipientId
      }
    };
  }

  async saveNotification(notification: Notification): Promise<void> {
    const key = `notifications:${notification.userId}`;
    await this.redis.zadd(
      key,
      notification.createdAt.getTime(),
      JSON.stringify(notification)
    );
  }

  async sendNotification(notification: Notification, recipientIds: string[]): Promise<void> {
    // Сохраняем уведомление
    await this.saveNotification(notification);

    for (const recipientId of recipientIds) {
      // Проверяем, подключен ли пользователь через WebSocket
      const userSockets = this.connectedUsers.get(recipientId);
      
      if (userSockets && userSockets.length > 0) {
        // Если пользователь онлайн, отправляем через WebSocket
        this.io.to(`user:${recipientId}`).emit('notification', notification);
      } else {
        // Если пользователь оффлайн, отправляем push-уведомление
        await this.sendPushNotification(notification, recipientId);
      }
    }
  }

  private async sendPushNotification(notification: Notification, recipientId: string): Promise<void> {
    if (!config.pushNotifications.enabled) return;

    try {
      const subscriptions = await this.getSubscriptions([recipientId]);
      if (subscriptions.length === 0) return;

      const payload = JSON.stringify({
        notification: {
          title: this.getNotificationTitle(notification),
          body: this.getNotificationBody(notification),
          icon: '/notification-icon.png',
          data: notification
        }
      });

      await Promise.all(
        subscriptions.map(subscription =>
          webpush.sendNotification(subscription, payload).catch(error => {
            if (error.statusCode === 410) {
              // Удаляем недействительную подписку
              this.removeSubscription(recipientId, subscription);
            }
            console.error('Error sending push notification:', error);
          })
        )
      );
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  private getNotificationTitle(notification: Notification): string {
    switch (notification.type) {
      case 'NEW_MESSAGE':
        return 'Новое сообщение';
      case 'CALL_STARTED':
        return 'Входящий звонок';
      case 'CALL_ENDED':
        return 'Звонок завершен';
      case 'CHANNEL_CREATED':
        return 'Новый канал';
      case 'FRIEND_REQUEST':
        return 'Запрос в друзья';
      default:
        return 'Уведомление';
    }
  }

  private getNotificationBody(notification: Notification): string {
    switch (notification.type) {
      case NotificationType.NEW_MESSAGE:
        const messageData = notification.data as MessageNotificationData;
        return messageData.content;
      case NotificationType.CALL_STARTED:
        const callStartData = notification.data as CallNotificationData;
        return `${callStartData.callerId} звонит вам`;
      case NotificationType.CALL_ENDED:
        const callEndData = notification.data as CallNotificationData;
        return `Звонок с ${callEndData.callerId} завершен`;
      case NotificationType.CHANNEL_CREATED:
        const channelData = notification.data as ChannelNotificationData;
        return `Создан новый канал: ${channelData.channelName}`;
      case NotificationType.FRIEND_REQUEST:
        const friendData = notification.data as FriendRequestNotificationData;
        return `${friendData.senderUsername} хочет добавить вас в друзья`;
      default:
        return '';
    }
  }

  private async getSubscriptions(userIds: string[]): Promise<webpush.PushSubscription[]> {
    const subscriptions: webpush.PushSubscription[] = [];
    for (const userId of userIds) {
      const userSubscriptions = await this.redis.smembers(`push:${userId}`);
      subscriptions.push(...userSubscriptions.map(sub => JSON.parse(sub)));
    }
    return subscriptions;
  }

  private async removeSubscription(userId: string, subscription: webpush.PushSubscription): Promise<void> {
    await this.redis.srem(`push:${userId}`, JSON.stringify(subscription));
  }

  async getNotifications(userId: string, lastId?: string): Promise<Notification[]> {
    const key = `notifications:${userId}`;
    let start = '-inf';
    
    if (lastId) {
      const lastNotification = await this.redis.zscore(key, lastId);
      if (lastNotification) {
        start = `(${lastNotification}`;
      }
    }

    const results = await this.redis.zrangebyscore(key, start, '+inf', 'LIMIT', 0, 50);
    return results.map(result => JSON.parse(result));
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    const key = `notifications:${userId}`;
    const multi = this.redis.multi();

    for (const id of notificationIds) {
      const notification = await this.redis.zscore(key, id);
      if (notification) {
        const parsed = JSON.parse(notification);
        parsed.isRead = true;
        multi.zadd(key, parsed.createdAt.getTime(), JSON.stringify(parsed));
      }
    }

    await multi.exec();
  }

  async deleteNotifications(userId: string, notificationIds: string[]): Promise<void> {
    const key = `notifications:${userId}`;
    await this.redis.zrem(key, ...notificationIds);
  }

  async getUnreadCount(userId: string): Promise<{
    total: number;
    calls: number;
    messages: number;
    friendRequests: number;
    channelCalls: number;
  }> {
    const key = `notifications:${userId}`;
    const notifications = await this.redis.zrange(key, 0, -1);
    
    const counts = {
      total: 0,
      calls: 0,
      messages: 0,
      friendRequests: 0,
      channelCalls: 0
    };

    for (const notification of notifications) {
      const parsed = JSON.parse(notification) as Notification;
      if (!parsed.isRead) {
        counts.total++;
        switch (parsed.type) {
          case 'NEW_MESSAGE':
            counts.messages++;
            break;
          case 'CALL_STARTED':
          case 'CALL_ENDED':
            if ('channelId' in parsed.data) {
              counts.channelCalls++;
            } else {
              counts.calls++;
            }
            break;
          case 'FRIEND_REQUEST':
            counts.friendRequests++;
            break;
        }
      }
    }

    return counts;
  }

  async handleEvent(event: { type: NotificationType; userId: string; data: NotificationData }): Promise<void> {
    try {
      const notification: Notification = {
        id: uuidv4(),
        type: event.type,
        userId: event.userId,
        createdAt: new Date(),
        isRead: false,
        data: event.data
      };

      // Сохраняем уведомление
      await this.notificationStore.addNotification(notification);

      // Отправляем уведомление через WebSocket
      this.io.to(`user:${event.userId}`).emit('notification', notification);
    } catch (error) {
      console.error('Error handling notification event:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationStore.getNotifications(userId);
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationStore.markAsRead(userId, notificationId);
  }

  async stop(): Promise<void> {
    try {
      await this.consumer.disconnect();
      await this.redis.quit();
      this.io.close();
    } catch (error) {
      console.error('Error stopping notification service:', error);
      throw error;
    }
  }
} 