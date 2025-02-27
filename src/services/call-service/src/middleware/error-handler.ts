import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substring(7);

  console.error(`[${timestamp}] Error occurred (RequestID: ${requestId}):`, {
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
      code: err.code,
      type: err.type,
      status: err.status || 500
    },
    request: {
      id: requestId,
      timestamp,
      path: req.path,
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      protocol: req.protocol,
      ip: req.ip,
      query: req.query,
      body: req.body,
      params: req.params,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        'user-agent': req.headers['user-agent'],
        'accept-language': req.headers['accept-language'],
        'content-type': req.headers['content-type'],
        'accept': req.headers.accept
      }
    },
    additionalInfo: {
      nodeEnv: process.env.NODE_ENV,
      processUptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  });

  if (err.status) {
    return res.status(err.status).json({
      status: err.status,
      message: err.message,
      requestId,
      timestamp
    });
  }

  return res.status(500).json({
    status: 500,
    message: 'Внутренняя ошибка сервера',
    requestId,
    timestamp
  });
}; 