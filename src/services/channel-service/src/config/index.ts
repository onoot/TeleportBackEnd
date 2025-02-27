import dotenv from 'dotenv';
import { Config } from '../types/config';
import { Permission } from '../entities/Role';

dotenv.config();

export const config: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'channel_service',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
    entities: ['src/entities/**/*.ts'],
    migrations: ['src/migrations/**/*.ts'],
    subscribers: ['src/subscribers/**/*.ts'],
    cli: {
      entitiesDir: 'src/entities',
      migrationsDir: 'src/migrations',
      subscribersDir: 'src/subscribers'
    }
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  callService: {
    url: process.env.CALL_SERVICE_URL || 'http://localhost:3003',
    healthCheckEndpoint: '/health'
  },

  defaultRoles: {
    owner: {
      name: 'Owner',
      permissions: [
        Permission.MANAGE_SERVER,
        Permission.MANAGE_ROLES,
        Permission.MANAGE_CHANNELS,
        Permission.MANAGE_CATEGORIES,
        Permission.MANAGE_MEMBERS,
        Permission.VIEW_CHANNELS,
        Permission.SEND_MESSAGES,
        Permission.CONNECT_VOICE
      ],
      position: 100,
      is_deletable: false
    },
    member: {
      name: 'Member',
      permissions: [
        Permission.VIEW_CHANNELS,
        Permission.SEND_MESSAGES,
        Permission.CONNECT_VOICE
      ],
      position: 1,
      is_deletable: false
    }
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    ...(process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD && {
      sasl: {
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
        mechanism: (process.env.KAFKA_MECHANISM || 'plain') as 'plain' | 'scram-sha-256' | 'scram-sha-512'
      }
    })
  }
}; 