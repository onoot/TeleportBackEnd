import { Kafka, Producer, Consumer } from 'kafkajs';
import { config } from '../config';
import { NotificationService } from './notification.service';

export class KafkaService {
  private producer: Producer;
  private consumer: Consumer;
  private kafka: Kafka;
  private static instance: KafkaService;

  private constructor(private readonly notificationService: NotificationService) {
    this.kafka = new Kafka({
      clientId: 'notification-service',
      brokers: config.kafka.brokers,
      ssl: config.kafka.ssl,
      ...(config.kafka.sasl && {
        sasl: {
          mechanism: config.kafka.sasl.mechanism,
          username: config.kafka.sasl.username,
          password: config.kafka.sasl.password
        }
      })
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'notification-service' });
  }

  public static getInstance(notificationService: NotificationService): KafkaService {
    if (!KafkaService.instance) {
      KafkaService.instance = new KafkaService(notificationService);
    }
    return KafkaService.instance;
  }

  async start(): Promise<void> {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      console.log('Successfully connected to Kafka');

      await this.consumer.subscribe({ topics: ['notifications', 'user-events'], fromBeginning: true });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value?.toString();
            if (value) {
              const event = JSON.parse(value);
              await this.notificationService.handleEvent(event);
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        },
      });
    } catch (error) {
      console.error('Error starting Kafka service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      console.log('Successfully disconnected from Kafka');
    } catch (error) {
      console.error('Error stopping Kafka service:', error);
      throw error;
    }
  }

  async emit(topic: string, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify({
              ...message,
              timestamp: new Date().toISOString()
            })
          }
        ]
      });
      console.log(`Message sent to topic ${topic}`);
    } catch (error) {
      console.error(`Error sending message to topic ${topic}:`, error);
      throw error;
    }
  }
} 