import { Request, Response, NextFunction } from 'express';
import { logSystemEvent } from './logger.middleware';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Erro interno no servidor';

  // Log to monitor
  logSystemEvent(
    err.name === 'PrismaClientKnownRequestError' ? 'DB_ERROR' : 'AUTH_ERROR',
    `Erro em ${req.method} ${req.url}: ${message}`,
    status >= 500 ? 'CRITICAL' : 'WARNING',
    { 
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        status,
        url: req.url
    }
  );

  console.error(`[ERROR] ${req.method} ${req.url}`, err);

  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString()
    }
  });
};
