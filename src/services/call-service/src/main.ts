import { NestFactory } from '@nestjs/core';
import { CallModule } from './CallModule';
import * as dotenv from 'dotenv';

async function bootstrap() {
  // Загружаем переменные окружения
  dotenv.config();

  const app = await NestFactory.create(CallModule);
  
  // Настраиваем CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });

  // Запускаем приложение
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Call service is running on port ${port}`);
}

bootstrap(); 