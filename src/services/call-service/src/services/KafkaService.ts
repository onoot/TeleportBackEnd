import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'call-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL === 'true' ? {
        mechanism: 'plain',
        username: process.env.KAFKA_USERNAME || '',
        password: process.env.KAFKA_PASSWORD || ''
      } : undefined
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'call-service-group' });
  }

  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
    
    // Подписываемся на необходимые топики
    await this.consumer.subscribe({ 
      topics: ['call.created', 'call.ended', 'call.participant.joined', 'call.participant.left'],
      fromBeginning: false 
    });

    await this.startConsumer();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  private async startConsumer() {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = message.value?.toString();
          if (!value) return;

          const data = JSON.parse(value);
          
          // Обработка различных событий
          switch (topic) {
            case 'call.created':
              // Обработка создания звонка
              break;
            case 'call.ended':
              // Обработка завершения звонка
              break;
            case 'call.participant.joined':
              // Обработка присоединения участника
              break;
            case 'call.participant.left':
              // Обработка выхода участника
              break;
          }
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      }
    });
  }

  async emit(topic: string, message: any): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        { 
          value: JSON.stringify(message),
          timestamp: Date.now().toString()
        }
      ]
    });
  }
} 