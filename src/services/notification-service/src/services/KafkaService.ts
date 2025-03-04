import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, Consumer, ConsumerSubscribeTopics, EachMessagePayload } from 'kafkajs';
import { NotificationType, Notification } from '../types/events';
import { WebSocketService } from './WebSocketService';
import { RedisService } from './RedisService';
import { metrics } from '../utils/metrics';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private readonly topics = [
    'messages',
    'calls',
    'channels',
    'servers',
    'users'
  ];

  constructor(
    private webSocketService: WebSocketService,
    private redisService: RedisService
  ) {
    this.kafka = new Kafka({
      clientId: 'notification-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL === 'true' ? {
        mechanism: 'plain',
        username: process.env.KAFKA_USERNAME || '',
        password: process.env.KAFKA_PASSWORD || ''
      } : undefined
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'notification-service-group' });
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      await this.consumer.connect();

      // Подписываемся на все топики
      await Promise.all(
        this.topics.map(topic =>
          this.consumer.subscribe({ topic, fromBeginning: false })
        )
      );

      await this.startConsumer();
      console.log('Connected to Kafka');
    } catch (error) {
      console.error('Error connecting to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      console.log('Disconnected from Kafka');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
      throw error;
    }
  }
  async emit(topic: string, message: any): Promise<void> {
    const endTimer = metrics.kafkaOperationDuration.startTimer({ type: topic });
    try {
      await this.producer.send({
        topic,
        messages: [{
          value: JSON.stringify(message),
          timestamp: Date.now().toString()
        }]
      });
      metrics.kafkaOperations.inc({ type: 'produce', status: 'success' });
    } catch (error) {
      console.error('Error sending message to Kafka:', error);
      metrics.kafkaOperations.inc({ type: 'produce', status: 'error' });
      throw error;
    } finally {
      endTimer();
    }
  }

  private async startConsumer(): Promise<void> {
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, message }) => {
          const notification = JSON.parse(message.value!.toString()) as Notification;
          const targetUsers = await this.getTargetUsers(notification);

          // Сохраняем уведомление в Redis
          await this.redisService.saveNotification(notification);

          // Отправляем уведомление через WebSocket
          if (targetUsers.length > 0) {
            this.webSocketService.sendToUsers(targetUsers, notification);
          }

          metrics.kafkaOperations.inc({ type: 'consume', status: 'success' });
        },
      });
    } catch (error) {
      console.error('Error processing Kafka message:', error);
      metrics.kafkaOperations.inc({ type: 'consume', status: 'error' });
      throw error;
    }
  }

  private async getTargetUsers(notification: Notification): Promise<number[]> {
    switch (notification.type) {
      case NotificationType.MESSAGE_CREATED:
      case NotificationType.MESSAGE_UPDATED:
      case NotificationType.MESSAGE_DELETED:
        // Получаем всех пользователей канала
        return this.redisService.getChannelParticipants(notification.data.channelId);

      case NotificationType.CALL_INITIATED:
      case NotificationType.CALL_ACCEPTED:
      case NotificationType.CALL_REJECTED:
      case NotificationType.CALL_ENDED:
        // Получаем участников звонка
        return this.redisService.getRoomParticipants(notification.data.roomId);

      case NotificationType.SERVER_UPDATE:
      case NotificationType.SERVER_DELETE:
      case NotificationType.CHANNEL_CREATE:
      case NotificationType.CHANNEL_UPDATE:
      case NotificationType.CHANNEL_DELETE:
        // Получаем всех участников сервера
        return this.redisService.getServerMembers(notification.data.serverId);

      default:
        return notification.targetUsers || [];
    }
  }
} 