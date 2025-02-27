import { Kafka, Producer, SASLOptions } from 'kafkajs';
import { config } from '../config';

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'user-service',
      brokers: config.kafka.brokers,
      ssl: config.kafka.ssl,
      sasl: config.kafka.sasl as SASLOptions
    });

    this.producer = this.kafka.producer();
    this.connect();
  }

  private async connect() {
    try {
      await this.producer.connect();
      console.log('Successfully connected to Kafka');
    } catch (error) {
      console.error('Error connecting to Kafka:', error);
      throw error;
    }
  }

  async emit(topic: string, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{
          value: JSON.stringify(message)
        }]
      });
    } catch (error) {
      console.error('Error sending message to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      console.log('Successfully disconnected from Kafka');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
      throw error;
    }
  }
} 