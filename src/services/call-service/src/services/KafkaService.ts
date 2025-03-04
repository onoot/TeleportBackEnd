import { Kafka, Producer } from 'kafkajs';

export class KafkaService {
  private producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: 'call-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: {
        mechanism: 'plain',
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || ''
      }
    });

    this.producer = kafka.producer();
    this.connect();
  }

  private async connect() {
    try {
      await this.producer.connect();
      console.log('Successfully connected to Kafka');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
    }
  }

  public async produce(topic: string, message: any) {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message)
          }
        ]
      });
    } catch (error) {
      console.error('Failed to produce message to Kafka:', error);
      throw error;
    }
  }

  public async disconnect() {
    try {
      await this.producer.disconnect();
      console.log('Successfully disconnected from Kafka');
    } catch (error) {
      console.error('Failed to disconnect from Kafka:', error);
    }
  }
} 