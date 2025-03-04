import { Kafka, Producer } from 'kafkajs';
import { config } from '../config';

export class KafkaService {
  private producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: 'message-service',
      brokers: config.kafka.brokers
    });

    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async send(topic: string, message: any): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        { 
          value: JSON.stringify(message)
        }
      ]
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
} 