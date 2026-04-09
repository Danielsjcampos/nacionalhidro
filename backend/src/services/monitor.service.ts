import si from 'systeminformation';
import prisma from '../lib/prisma';

export class MonitorService {
  static async getSystemStats() {
    try {
      const [cpu, mem, load, currentLoad] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.currentLoad(),
        si.currentLoad()
      ]);

      return {
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          usage: currentLoad.currentLoad.toFixed(2),
          temp: 'N/A' // Requires admin privileges often
        },
        memory: {
          total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          active: (mem.active / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          usage: ((mem.active / mem.total) * 100).toFixed(2)
        },
        uptime: process.uptime(),
        platform: process.platform
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return null;
    }
  }

  static async getDbHealth() {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;
      return { status: 'UP', latency: duration };
    } catch (error) {
      return { status: 'DOWN', latency: 0, error: String(error) };
    }
  }
}
