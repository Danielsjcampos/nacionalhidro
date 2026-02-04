import { Request, Response, NextFunction } from 'express';

export interface LogEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: Date;
  ip: string;
}

// Circular buffer to store recent logs in memory
export const recentLogs: LogEntry[] = [];
const MAX_LOGS = 100;

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log: LogEntry = {
      id: Math.random().toString(36).substring(7),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      timestamp: new Date(),
      ip: req.ip || req.socket.remoteAddress || 'unknown'
    };

    recentLogs.unshift(log);
    if (recentLogs.length > MAX_LOGS) {
      recentLogs.pop();
    }
  });

  next();
};

export const getSystemStats = () => {
    // Helper to get aggregated stats from logs
    const totalRequests = recentLogs.length;
    const errorCount = recentLogs.filter(l => l.status >= 400).length;
    const avgDuration = totalRequests > 0 
        ? recentLogs.reduce((acc, curr) => acc + curr.duration, 0) / totalRequests 
        : 0;

    return {
        totalRequests,
        errorCount,
        avgDuration
    };
};
