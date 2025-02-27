import { SASLOptions } from 'kafkajs';

interface KafkaConfig {
  brokers: string[];
  ssl: boolean;
  sasl?: SASLOptions;
}

interface JwtConfig {
  secret: string;
  expiresIn: string;
}

interface Config {
  port: number;
  jwt: JwtConfig;
  kafka: KafkaConfig;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000'),
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    ...(process.env.KAFKA_SASL === 'true' && {
      sasl: {
        username: process.env.KAFKA_USERNAME || '',
        password: process.env.KAFKA_PASSWORD || '',
        mechanism: process.env.KAFKA_MECHANISM as 'plain' | 'scram-sha-256' | 'scram-sha-512'
      } as SASLOptions
    })
  }
}; 