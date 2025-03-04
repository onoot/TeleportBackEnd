import 'dotenv/config';
import { App } from './app';
import { config } from './config';
import { initializeDataSource } from './data-source';

async function bootstrap() {
  try {
    // Инициализируем соединение с базой данных
    await initializeDataSource();
    console.log('Database connection initialized');

    // Создаем и запускаем приложение
    const app = new App(config.port);
    await app.listen();
    
    console.log(`Channel service is running on port ${config.port}`);
    
    // Обработка сигналов завершения
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      await app.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap(); 