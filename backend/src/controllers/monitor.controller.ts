import { Request, Response } from 'express';
import os from 'os';
import prisma from '../lib/prisma';
import { recentLogs, getSystemStats } from '../middlewares/logger.middleware';

export const getMonitorStats = async (req: Request, res: Response) => {
  try {
    const usage = process.memoryUsage();
    const traffic = getSystemStats();

    // Check DB Latency
    const startDb = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startDb;

    const stats = {
      system: {
        uptime: os.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          processHeap: usage.heapUsed
        },
        cpu: os.loadavg(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length
      },
      db: {
        status: 'connected',
        latency: dbLatency,
      },
      traffic: {
        requests: traffic.totalRequests,
        errors: traffic.errorCount,
        avgLatency: Number(traffic.avgDuration.toFixed(2))
      },
      logs: recentLogs.slice(0, 50),
      events: traffic.events,
      webhooks: await prisma.webhookLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' }
      })
    };

    res.json(stats);
  } catch (error) {
    console.error('Monitor Stats Error:', error);
    res.status(500).json({ error: 'Erro ao carregar estatísticas do monitor' });
  }
};

export const getWebhookLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.webhookLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar logs de webhooks' });
  }
};
