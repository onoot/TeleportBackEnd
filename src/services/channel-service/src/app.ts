import 'reflect-metadata';
import express from 'express';
import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { initializeDataSource, AppDataSource } from './data-source';
import { config } from './config';
import routes from './routes';
import { notificationService } from './services/NotificationService';
import { RoleService } from './services/RoleService';
import { ServerController } from './controllers/ServerController';

export class App {
  public app: express.Application;
  public server: HttpServer;
  public io: SocketServer;
  public port: number;

  constructor(port: number) {
    this.app = express();
    this.port = port;
    this.server = new HttpServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: config.cors.origin,
        methods: config.cors.methods,
        allowedHeaders: config.cors.allowedHeaders
      }
    });
  }

  private async initializeServices() {
    try {
      // Инициализируем базу данных
      await initializeDataSource();
      console.log('Database initialized successfully');

      // Дожидаемся инициализации базы данных перед инициализацией контроллеров
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Инициализируем контроллеры и сервисы последовательно
      await RoleService.getInstance();
      await ServerController.getInstance();
      console.log('Controllers and services initialized successfully');

      // Инициализируем Kafka
      await notificationService.connect();
      console.log('Kafka initialized successfully');

    } catch (error) {
      console.error('Error initializing services:', error);
      throw error;
    }
  }

  private initializeMiddlewares() {
    this.app.use(express.json());
    this.app.use(cors({
      origin: config.cors.origin,
      methods: config.cors.methods,
      allowedHeaders: config.cors.allowedHeaders
    }));
  }

  private initializeRoutes() {
    this.app.use('/api/v1', routes);
  }

  private initializeErrorHandling() {
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(err.status || 500).json({
        message: err.message || 'Internal server error'
      });
    });
  }

  public async listen() {
    try {
      await this.initializeServices();
      this.initializeMiddlewares();
      this.initializeRoutes();
      this.initializeErrorHandling();

      this.server.listen(this.port, () => {
        console.log(`Server is running on port ${this.port}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async close() {
    try {
      await notificationService.disconnect();
      await AppDataSource.destroy();
      this.server.close();
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

// Обработка сигналов завершения
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  const app = new App(config.port);
  await app.close();
  process.exit(0);
}); 