import 'dotenv/config';
import { App } from './app';

async function bootstrap() {
  try {
    const app = new App();
    const port = parseInt(process.env.PORT || '3002');
    
    await app.start(port);
    console.log(`Notification service is running on port ${port}`);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap(); 