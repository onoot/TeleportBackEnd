import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Логируем запрос
  console.log('=== Request Start ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('=== Request End ===');

  // Сохраняем оригинальные методы
  const originalSend = res.send;

  // Переопределяем метод send для логирования ответа
  res.send = function(body: any) {
    console.log('=== Response Start ===');
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.getHeaders(), null, 2));
    console.log('Body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
    console.log('=== Response End ===');

    return originalSend.call(res, body);
  };

  next();
}; 