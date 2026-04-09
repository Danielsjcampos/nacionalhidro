import { Request, Response, NextFunction } from 'express';

export const telemetryState = {
  totalRequests: 0,
  activeRequests: 0,
  statusCodes: {
    '2xx': 0,
    '4xx': 0,
    '5xx': 0
  },
  lastLatency: 0,
  averageLatency: 0,
  history: [] as { time: number, rps: number, latency: number }[]
};

// Reset history every hour or manageable chunk to prevent memory leak in this simple implementation
setInterval(() => {
  if (telemetryState.history.length > 3600) { // Keep last hour approx (1 sec ticks)
    telemetryState.history = telemetryState.history.slice(-3600);
  }
}, 60000);

export function telemetryMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  telemetryState.totalRequests++;
  telemetryState.activeRequests++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    telemetryState.activeRequests--;
    telemetryState.lastLatency = duration;
    
    // Simple moving average for latency
    telemetryState.averageLatency = (telemetryState.averageLatency * 9 + duration) / 10;

    const status = res.statusCode;
    if (status >= 200 && status < 300) telemetryState.statusCodes['2xx']++;
    else if (status >= 400 && status < 500) telemetryState.statusCodes['4xx']++;
    else if (status >= 500) telemetryState.statusCodes['5xx']++;
  });

  next();
}
