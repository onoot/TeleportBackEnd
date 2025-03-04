import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { KafkaService } from './services/kafka.service';
import { NotificationStore } from './services/notification.store';
import { Kafka } from 'kafkajs';
import { config } from './config';

export class App {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: Server;
  private kafka: Kafka;
  private consumer: any;
  private notificationService: NotificationService;
  private notificationStore: NotificationStore;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.cors.origin,
        methods: config.cors.methods
      }
    });

    this.setupMiddleware();
    this.setupKafka();
    this.setupServices();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors(config.cors));
    this.app.use(express.json());
  }

  private setupKafka(): void {
    const kafkaConfig: any = {
      clientId: 'notification-service',
      brokers: config.kafka.brokers,
      ssl: config.kafka.ssl
    };

    if (config.kafka.sasl) {
      kafkaConfig.sasl = config.kafka.sasl;
      console.log('Kafka SASL config:', JSON.stringify(config.kafka.sasl, null, 2));
    }

    console.log('Full Kafka config:', JSON.stringify(kafkaConfig, null, 2));

    this.kafka = new Kafka(kafkaConfig);
    this.consumer = this.kafka.consumer({ 
      groupId: 'notification-service-group'
    });
  }

  private setupServices(): void {
    this.notificationStore = new NotificationStore();
    this.notificationService = new NotificationService(
      this.consumer,
      this.io,
      this.notificationStore
    );
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
      await this.consumer.connect();
      await this.consumer.subscribe({ 
        topics: ['messages', 'calls', 'channels', 'friend-requests'],
        fromBeginning: false 
      });
      await this.notificationService.start();

      const port = config.port || 3000;
      this.server.listen(port, () => {
        console.log(`Notification service is running on port ${port}`);
      });
    } catch (error) {
      console.error('Failed to start application:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.notificationService.stop();
      this.server.close();
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