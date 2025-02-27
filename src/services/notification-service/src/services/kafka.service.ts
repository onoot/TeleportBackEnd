import { Kafka, Consumer, Producer } from 'kafkajs';
import { config } from '../config';
import { KafkaNotificationMessage } from '../types';
import { NotificationService } from './notification.service';

export class KafkaService {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.kafka = new Kafka(config.kafka);
    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
    this.producer = this.kafka.producer();
    this.notificationService = notificationService;
  }

  async start() {
    await this.producer.connect();
    await this.consumer.connect();

    // Подписываемся на топики с разными типами уведомлений
    await this.consumer.subscribe({ 
      topics: [
        'notifications.messages',
        'notifications.calls',
        'notifications.channels',
        'notifications.friends'
      ],
      fromBeginning: false 
    });

    await this.consumer.run({
      partitionsConsumedConcurrently: 3,
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.key || !message.value) return;

          const key = message.key.toString();
          const kafkaMessage: KafkaNotificationMessage = JSON.parse(message.value.toString());
          
          // Отправляем уведомление через WebSocket или push
          await this.notificationService.sendNotification(
            kafkaMessage.value.notification,
            kafkaMessage.value.recipients
          );

        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
  }

  async stop() {
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }
} 