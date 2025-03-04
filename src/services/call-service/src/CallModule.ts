import { Express } from 'express';
import { CallService } from './services/CallService';
import { RedisService } from './services/RedisService';
import { KafkaService } from './services/KafkaService';
import { CallController } from './controllers/v1/CallController';
import { RoomService } from './services/RoomService';
import { WebSocketService } from './services/WebSocketService';

export class CallModule {
  private redisService: RedisService = new RedisService();
  private kafkaService: KafkaService = new KafkaService();
  private wsService: WebSocketService = WebSocketService.getInstance();
  private callService: CallService;
  private roomService: RoomService;
  private callController: CallController;

  constructor() {
    // Инициализируем сервисы, зависящие от базовых
    this.callService = new CallService(this.redisService, this.kafkaService);
    this.roomService = new RoomService();

    // Инициализируем контроллер
    this.callController = new CallController(this.roomService, this.callService);
  }

  public setupRoutes(app: Express): void {
    // Подключаем маршруты контроллера
    app.use('/api/v1/calls', this.callController.router);
  }

  public async shutdown(): Promise<void> {
    // Корректно завершаем работу сервисов
    await this.kafkaService.disconnect();
    // Здесь можно добавить другие операции очистки при необходимости
  }

  // Геттеры для доступа к сервисам, если потребуется
  public getCallService(): CallService {
    return this.callService;
  }

  public getRedisService(): RedisService {
    return this.redisService;
  }

  public getKafkaService(): KafkaService {
    return this.kafkaService;
  }

  public getWebSocketService(): WebSocketService {
    return this.wsService;
  }
} 