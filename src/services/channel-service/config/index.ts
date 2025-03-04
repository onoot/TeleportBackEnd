import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  database: {
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    logging: boolean;
    entities: string[];
    migrations: string[];
    subscribers: string[];
    cli: {
      entitiesDir: string;
      migrationsDir: string;
      subscribersDir: string;
    };
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  callService: {
    url: string;
    healthCheckEndpoint: string;
  };
  defaultRoles: {
    owner: {
      name: string;
      permissions: string[];
      position: number;
      is_deletable: boolean;
    };
    member: {
      name: string;
      permissions: string[];
      position: number;
      is_deletable: boolean;
    };
  };
  cors: {
    origin: string;
    methods: string[];
    allowedHeaders: string[];
  };
  logging: {
    level: string;
  };
  r2: {
    accountId: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucketName: string;
    publicUrl: string;
  };
}

export const config: Config = {
  port: Number(process.env.PORT) || 3000,
  
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
      permissions: ['MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'MANAGE_CATEGORIES', 'MANAGE_MEMBERS', 'VIEW_CHANNELS', 'SEND_MESSAGES', 'CONNECT_VOICE'],
      position: 100,
      is_deletable: false
    },
    member: {
      name: 'Member',
      permissions: ['VIEW_CHANNELS', 'SEND_MESSAGES', 'CONNECT_VOICE'],
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

  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.R2_ACCESS_KEY_SECRET || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },
}; 