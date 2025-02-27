import { Kafka, Producer } from 'kafkajs';
import { config } from '../config';
import { Call, CallStatus } from '../types';

class KafkaProducer {
  private producer: Producer;
  private kafka: Kafka;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'call-service',
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

    this.producer = this.kafka.producer();

    this.producer.on('producer.connect', () => {
      console.log('Producer connected successfully');
    });

    this.producer.on('producer.disconnect', () => {
      console.log('Producer disconnected');
    });

    this.producer.on('producer.network.request_timeout', (payload) => {
      console.error('Producer network request timeout:', payload);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      console.log('Connected to Kafka');
    } catch (error) {
      console.error('Error connecting to Kafka:', error);
      throw error;
    }
  }

  async sendMessage(topic: string, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          { value: JSON.stringify(message) }
        ]
      });
    } catch (error) {
      console.error('Error sending message to Kafka:', error);
      throw error;
    }
  }

  async sendCallNotification(call: Call): Promise<void> {
    try {
      const message = {
        callId: call.id,
        initiatorId: call.initiator_id,
        type: call.type,
        status: call.status,
        roomId: call.room_id,
        action: this.getCallAction(call.status),
        timestamp: new Date().toISOString()
      };

      await this.sendMessage('calls', message);
      console.log('Call notification sent to Kafka:', message);
    } catch (error) {
      console.error('Error sending call notification to Kafka:', error);
      throw error;
    }
  }

  private getCallAction(status: CallStatus): string {
    switch (status) {
      case CallStatus.INITIATED:
        return 'started';
      case CallStatus.ENDED:
      case CallStatus.REJECTED:
        return 'ended';
      case CallStatus.CONNECTED:
        return 'connected';
      default:
        return 'unknown';
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      console.log('Disconnected from Kafka');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
      throw error;
    }
  }
}

export const kafkaProducer = new KafkaProducer(); 