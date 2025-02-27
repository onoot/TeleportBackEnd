import { SASLOptions } from 'kafkajs';

interface KafkaConfig {
  clientId: string;
  brokers: string[];
  ssl: boolean;
  sasl?: SASLOptions;
  groupId: string;
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

interface Config {
  port: number;
  kafka: KafkaConfig;
  redis: RedisConfig;
  pushNotifications: {
    enabled: boolean;
    webPush: {
      publicKey: string;
      privateKey: string;
      subject: string;
    };
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3002'),
  kafka: {
    clientId: 'notification-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    groupId: 'notification-service-group',
    ...(process.env.KAFKA_SASL === 'true' && {
      sasl: {
        username: process.env.KAFKA_USERNAME || '',
        password: process.env.KAFKA_PASSWORD || '',
        mechanism: process.env.KAFKA_MECHANISM as 'plain' | 'scram-sha-256' | 'scram-sha-512'
      } as SASLOptions
    })
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  pushNotifications: {
    enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
    webPush: {
      publicKey: process.env.WEB_PUSH_PUBLIC_KEY || '',
      privateKey: process.env.WEB_PUSH_PRIVATE_KEY || '',
      subject: process.env.WEB_PUSH_SUBJECT || ''
    }
  }
}; 