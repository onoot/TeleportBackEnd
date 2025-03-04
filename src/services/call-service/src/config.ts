import { config as dotenvConfig } from 'dotenv';
import { SASLOptions } from 'kafkajs';
import dotenv from 'dotenv';

// Загружаем .env файл только в режиме разработки
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig();
}

dotenv.config();

function getEnvVar(name: string, defaultValue: string = ''): string {
  const value = process.env[name];
  if (!value) {
    console.warn(`Warning: Environment variable ${name} not found, using default: ${defaultValue}`);
    return defaultValue;
  }
  return value;
}

export const redisConfig = {
  host: getEnvVar('REDIS_HOST', 'localhost'),
  port: parseInt(getEnvVar('REDIS_PORT', '6379')),
  username: getEnvVar('REDIS_USER', 'default'),
  password: getEnvVar('REDIS_PASSWORD', ''),
  retryStrategy: (times: number) => {
    console.log(`Redis retry attempt ${times}`);
    return Math.min(times * 100, 3000);
  },
  maxRetriesPerRequest: 10,
  enableOfflineQueue: true,
  connectTimeout: 60000,
  lazyConnect: false,
  reconnectOnError: (err: Error) => {
    console.error('Redis reconnect error:', err);
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
};

console.log('Redis configuration:', {
  ...redisConfig,
  password: '***'
});

const kafkaBrokers = getEnvVar('KAFKA_BROKERS', 'localhost:9092');
const kafkaSaslUsername = getEnvVar('KAFKA_SASL_USERNAME', '');
const kafkaSaslPassword = getEnvVar('KAFKA_SASL_PASSWORD', '');
const kafkaSsl = getEnvVar('KAFKA_SSL', 'false') === 'true';
const kafkaSaslMechanism = getEnvVar('KAFKA_SASL_MECHANISM', 'PLAIN').toUpperCase();

console.log('Kafka configuration:', {
  brokers: kafkaBrokers,
  ssl: kafkaSsl,
  username: kafkaSaslUsername ? '***' : 'not set',
  password: kafkaSaslPassword ? '***' : 'not set',
  saslMechanism: kafkaSaslMechanism
});

export const kafkaConfig = {
  clientId: 'call-service',
  brokers: kafkaBrokers.split(','),
  ssl: kafkaSsl,
  sasl: process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD
    ? {
        mechanism: 'plain',
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD,
      }
    : undefined,
};

const dbHost = getEnvVar('POSTGRES_HOST', 'localhost');
const dbPort = parseInt(getEnvVar('POSTGRES_PORT', '5432'));
const dbUser = getEnvVar('POSTGRES_USER', 'postgres');
const dbPassword = getEnvVar('POSTGRES_PASSWORD', '');
const dbName = getEnvVar('POSTGRES_DB', 'postgres');

console.log('Database configuration:', {
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: '***'
});

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3003'),
  wsPort: parseInt(process.env.WS_PORT || '8083'),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/calls',
    database: process.env.MONGODB_DATABASE || 'calls'
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'messenger',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USER || '',
    password: process.env.REDIS_PASSWORD || ''
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret'
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: {
      mechanism: process.env.KAFKA_SASL_MECHANISM as 'plain' | 'scram-sha-256' | 'scram-sha-512',
      username: process.env.KAFKA_USERNAME || '',
      password: process.env.KAFKA_PASSWORD || ''
    }
  }
};