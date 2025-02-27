import { Kafka, Producer } from 'kafkajs';
import { config } from '../config';
import { NotificationEvent } from '../types/events';
import { kafkaNotificationCounter, kafkaOperationDuration } from '../metrics';

class NotificationService {
  private producer: Producer;
  private static instance: NotificationService;

  private constructor() {
    const kafka = new Kafka({
      clientId: 'channel-service',
      brokers: config.kafka.brokers,
      ssl: config.kafka.ssl,
      ...(config.kafka.sasl?.username && config.kafka.sasl?.password && {
        sasl: {
          mechanism: 'plain',
          username: config.kafka.sasl.username,
          password: config.kafka.sasl.password
        }
      })
    });

    this.producer = kafka.producer();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async connect(): Promise<void> {
    const endTimer = kafkaOperationDuration.startTimer({ operation: 'connect' });
    try {
      await this.producer.connect();
      console.log('Successfully connected to Kafka');
      kafkaNotificationCounter.inc({ type: 'connection', status: 'success' });
      endTimer();
    } catch (error) {
      kafkaNotificationCounter.inc({ type: 'connection', status: 'error' });
      endTimer();
      console.error('Error connecting to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const endTimer = kafkaOperationDuration.startTimer({ operation: 'disconnect' });
    try {
      await this.producer.disconnect();
      console.log('Successfully disconnected from Kafka');
      kafkaNotificationCounter.inc({ type: 'disconnection', status: 'success' });
      endTimer();
    } catch (error) {
      kafkaNotificationCounter.inc({ type: 'disconnection', status: 'error' });
      endTimer();
      console.error('Error disconnecting from Kafka:', error);
      throw error;
    }
  }

  async sendNotification(event: NotificationEvent): Promise<void> {
    const endTimer = kafkaOperationDuration.startTimer({ operation: 'send_notification' });
    try {
      const message = {
        key: `${event.serverId}`,
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString()
        })
      };

      await this.producer.send({
        topic: 'channel-notifications',
        messages: [message]
      });

      kafkaNotificationCounter.inc({ type: event.type, status: 'success' });
      console.log(`Notification sent to Kafka: ${event.type}`);
      endTimer();
    } catch (error) {
      kafkaNotificationCounter.inc({ type: event.type, status: 'error' });
      endTimer();
      console.error('Error sending notification to Kafka:', error);
      throw error;
    }
  }

  async sendVoiceRoomUpdate(event: NotificationEvent): Promise<void> {
    const endTimer = kafkaOperationDuration.startTimer({ operation: 'send_voice_update' });
    try {
      const message = {
        key: `${event.serverId}`,
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString()
        })
      };

      await this.producer.send({
        topic: 'voice-room-updates',
        messages: [message]
      });

      kafkaNotificationCounter.inc({ type: 'voice_update', status: 'success' });
      console.log(`Voice room update sent to Kafka: ${event.type}`);
      endTimer();
    } catch (error) {
      kafkaNotificationCounter.inc({ type: 'voice_update', status: 'error' });
      endTimer();
      console.error('Error sending voice room update to Kafka:', error);
      throw error;
    }
  }
}

export const notificationService = NotificationService.getInstance(); 