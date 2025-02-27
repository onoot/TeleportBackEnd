import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { KafkaService } from './services/kafka.service';
import { config } from './config';

export class App {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: SocketServer;
  private notificationService: NotificationService;
  private kafkaService: KafkaService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    this.setupMiddleware();
    this.setupServices();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupServices(): void {
    this.notificationService = new NotificationService(this.io);
    this.kafkaService = new KafkaService(this.notificationService);
  }

  private setupRoutes(): void {
    const notificationController = new NotificationController(this.notificationService);
    this.app.use('/api/v1/notifications', notificationController.getRouter());

    // Эндпоинт для проверки здоровья сервиса
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    });
  }

  async start(): Promise<void> {
    try {
      await this.kafkaService.start();
      this.server.listen(config.port, () => {
        console.log(`Notification service is running on port ${config.port}`);
      });
    } catch (error) {
      console.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.kafkaService.stop();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Запуск приложения
const app = new App();
app.start();

// Обработка сигналов завершения
process.on('SIGTERM', () => app.stop());
process.on('SIGINT', () => app.stop()); 