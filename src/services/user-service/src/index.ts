import 'reflect-metadata';
import express from 'express';
import { useExpressServer } from 'routing-controllers';
import { config as dotenvConfig } from 'dotenv';
import cors from 'cors';
import { UserController } from './controllers/v1/UserController';
import { initializeDatabase } from './utils/init-db';
import { initializeDataSource } from './data-source';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { config as appConfig } from '../config';
import { producer as kafkaProducer } from './kafka/producer';
import { redisClient } from './redis/client';
import { UserModel } from './models/UserModel';

// Загружаем переменные окружения
dotenvConfig();

const app = express();
const port = appConfig.port;

// Настраиваем CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400
}));

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для логирования
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Настраиваем routing-controllers
useExpressServer(app, {
  controllers: [UserController],
  routePrefix: '/api/v1',
  validation: true,
  classTransformer: true,
  cors: true,
  development: process.env.NODE_ENV !== 'production',
  defaultErrorHandler: false,
  defaults: {
    nullResultCode: 404,
    undefinedResultCode: 204,
    paramOptions: {
      required: true
    }
  }
});

// Обработчик ошибок
app.use(errorHandler);

// Инициализируем сервисы и запускаем сервер
async function bootstrap() {
  try {
    // Инициализируем базу данных через TypeORM
    await initializeDataSource();
    console.log('Database initialized successfully with TypeORM');
    
    // Инициализируем базовые таблицы и триггеры
    await initializeDatabase();
    console.log('Additional database initialization completed');

    // Временно отключаем Redis
    // await redisClient.connect();
    // console.log('Successfully connected to Redis');

    // Временно отключаем Kafka
    // await kafkaProducer.connect();
    // console.log('Successfully connected to Kafka');

    await UserModel.addEmailVerifiedColumn();
    console.log('Email verified column added successfully');

    app.listen(port, () => {
      console.log(`User service is running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Обработка завершения работы
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  try {
    await kafkaProducer.disconnect();
    await redisClient.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

bootstrap(); 