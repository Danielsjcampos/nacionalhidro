import { Request, Response, NextFunction } from 'express';

export interface LogEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: Date;
  ip: string;
  userAgent?: string;
}

export interface SystemEvent {
  id: string;
  type: 'LOGIN' | 'AUTH_ERROR' | 'DB_ERROR' | 'SERVER_START' | 'CONFIG_CHANGE';
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: Date;
  metadata?: any;
}

// Circular buffers
export const recentLogs: LogEntry[] = [];
export const systemEvents: SystemEvent[] = [];
const MAX_LOGS = 100;
const MAX_EVENTS = 50;

export const logSystemEvent = (type: SystemEvent['type'], message: string, severity: SystemEvent['severity'] = 'INFO', metadata?: any) => {
  const event: SystemEvent = {
    id: Math.random().toString(36).substring(7),
    type,
    message,
    severity,
    timestamp: new Date(),
    metadata
  };
  systemEvents.unshift(event);
  if (systemEvents.length > MAX_EVENTS) systemEvents.pop();
};

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
      ip: req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent']
    };

    recentLogs.unshift(log);
    if (recentLogs.length > MAX_LOGS) {
      recentLogs.pop();
    }
  });

  next();
};

export const getSystemStats = () => {
    const totalRequests = recentLogs.length;
    const errorCount = recentLogs.filter(l => l.status >= 400).length;
    const avgDuration = totalRequests > 0 
        ? recentLogs.reduce((acc, curr) => acc + curr.duration, 0) / totalRequests 
        : 0;

    return {
        totalRequests,
        errorCount,
        avgDuration,
        events: systemEvents
    };
};
