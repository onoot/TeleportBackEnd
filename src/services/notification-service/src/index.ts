import 'dotenv/config';
import { App } from './app';

async function bootstrap() {
  try {
    const app = new App();
    await app.start();
    console.log(`Notification service is running`);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap(); 