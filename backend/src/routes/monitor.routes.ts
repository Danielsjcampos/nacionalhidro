import { Router } from 'express';
import { getMonitorStats, getWebhookLogs } from '../controllers/monitor.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, getMonitorStats);
router.get('/webhooks', authenticate, getWebhookLogs);

export default router;
