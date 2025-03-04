import 'reflect-metadata';
import express from 'express';
import { useExpressServer } from 'routing-controllers';
import { CallController } from './controllers/v1/CallController';
import { RoomController } from './controllers/v1/RoomController';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { AppDataSource, initializeDataSource } from './data-source';
import { redisClient, getRedisClient } from './redis/client';
import { kafkaProducer } from './kafka/producer';
import { WebSocketService } from './services/WebSocketService';
import http, { Server } from 'http';
import { json } from 'body-parser';
import cors from 'cors';
import { RoomService } from './services/RoomService';
import { initializeMongo } from './db/mongo';
import { config } from './config';
import WebSocket from 'ws';
import bodyParser from 'body-parser';

console.log('Starting call-service...');

// Инициализируем Express приложение
const app = express();
const server = new Server(app);
const wss = new WebSocket.Server({ 
  server,
  port: config.wsPort 
});
const roomService = new RoomService();

let isServiceReady = false;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => {
  if (!isServiceReady) {
    return res.status(503).json({
      status: 'error',
      message: 'Service is starting up'
    });
  }
  res.json({ status: 'ok' });
});

console.log('Middleware and health check endpoint configured');

// Настраиваем контроллеры
useExpressServer(app, {
  controllers: [CallController, RoomController],
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

console.log('Controllers configured');

// Обработчик ошибок
app.use(errorHandler);

// Room endpoints
app.post('/rooms', async (req, res) => {
  try {
    const { name, userId } = req.body;
    const room = await roomService.createRoom(name, userId);
    res.json(room);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

app.post('/rooms/join', async (req, res) => {
  try {
    const { inviteCode, userId } = req.body;
    const room = await roomService.joinRoomByInvite(inviteCode, userId);
    res.json(room);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

app.post('/rooms/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    await roomService.leaveRoom(roomId, userId);
    res.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

app.get('/rooms/:roomId/participants', async (req, res) => {
  try {
    const { roomId } = req.params;
    const participants = await roomService.getRoomParticipants(roomId);
    res.json(participants);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

app.get('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomService.getRoomById(roomId);
    res.json(room);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Запускаем сервер
const PORT = parseInt(process.env.PORT || '8080');
const WS_PORT = parseInt(process.env.WS_PORT || '8083');

async function initializeServices() {
  try {
    console.log('Starting services initialization...');

    // Запускаем HTTP сервер первым
    await new Promise<void>((resolve) => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`Call service HTTP server is running on port ${PORT}`);
        resolve();
      });
    });

    // Инициализируем TypeORM
    await initializeDataSource();
    console.log('TypeORM initialized successfully');

    // Подключаемся к Kafka
    await kafkaProducer.connect();
    console.log('Successfully connected to Kafka');

    // Инициализируем Redis
    console.log('Initializing Redis connection...');
    try {
      await getRedisClient();
      console.log('Redis connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Redis connection:', error);
      throw error;
    }

    // Создаем WebSocket сервер
    const wsService = WebSocketService.getInstance();
    console.log(`WebSocket server is running on port ${WS_PORT}`);

    // Помечаем сервис как готовый
    isServiceReady = true;
    console.log('Service is ready to handle requests');

    return true;
  } catch (error) {
    console.error('Failed to initialize services:', error);
    return false;
  }
}

async function bootstrap() {
  try {
    // Инициализируем сервисы
    const servicesInitialized = await initializeServices();
    if (!servicesInitialized) {
      throw new Error('Failed to initialize required services');
    }

    console.log('All services initialized successfully');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Обработка завершения работы
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Closing servers...');
  try {
    isServiceReady = false;
    await AppDataSource.destroy();
    await redisClient.quit();
    await kafkaProducer.disconnect();
    server.close(() => {
      console.log('HTTP and WebSocket servers closed');
      process.exit(0);
    });

    // Закрываем WebSocket сервер
    const wsService = WebSocketService.getInstance();
    wsService.close();
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  isServiceReady = false;
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  isServiceReady = false;
  process.exit(1);
});

// Запускаем приложение
bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
}); 