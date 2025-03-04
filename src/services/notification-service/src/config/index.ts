import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string;
    methods: string[];
    credentials: boolean;
  };
  kafka: {
    brokers: string[];
    ssl: boolean;
    sasl: {
      mechanism: 'plain';
      username: string;
      password: string;
    };
  };
  mongodb: {
    uri: string;
    options: {
      useNewUrlParser: boolean;
      useUnifiedTopology: boolean;
    };
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
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
  port: Number(process.env.PORT) || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: {
      mechanism: 'plain',
      username: process.env.KAFKA_SASL_USERNAME || '',
      password: process.env.KAFKA_SASL_PASSWORD || ''
    }
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/messenger',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
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