import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string | null;
}

interface KafkaConfig {
  brokers: string[];
}

interface ServicesConfig {
  channel: string;
}

interface JwtConfig {
  secret: string;
}

export interface Config {
  port: number | string;
  database: DatabaseConfig;
  redis: RedisConfig;
  kafka: KafkaConfig;
  services: ServicesConfig;
  jwt: JwtConfig;
}

export const config: Config = {
  port: process.env.PORT || 3002,
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'message_service'
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || null
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
  },

  services: {
    channel: process.env.CHANNEL_SERVICE_URL || 'http://localhost:3001'
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }
}; 