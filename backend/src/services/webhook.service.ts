import prisma from '../lib/prisma';

export const logWebhook = async (provider: string, req: any, res: any, duration: number) => {
  try {
    await prisma.webhookLog.create({
      data: {
        provider,
        url: req.originalUrl || req.url,
        method: req.method,
        payload: req.body || {},
        statusCode: res.statusCode,
        duration,
        status: res.statusCode < 300 ? 'SUCESSO' : 'ERRO'
      }
    });
  } catch (error) {
    console.error('Failed to log webhook:', error);
  }
};
