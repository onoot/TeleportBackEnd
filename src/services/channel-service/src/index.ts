import 'dotenv/config';
import { App } from './app';
import { config } from './config';

async function bootstrap() {
  try {
    const app = new App(config.port);
    await app.listen();
    
    console.log(`Channel service is running on port ${config.port}`);
    
    // Обработка сигналов завершения
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap(); 