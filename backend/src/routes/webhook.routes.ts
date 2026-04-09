import { Router } from 'express';
import WebhookController from '../controllers/webhook.controller';

const router = Router();

// Endpoint genérico para receber leads de formulários externos
router.post('/lead', WebhookController.handleLeadWebhook);

// Endpoints específicos para manter compatibilidade, se necessário
router.post('/fluent-forms', WebhookController.handleLeadWebhook);
router.post('/twotime-chat', WebhookController.handleLeadWebhook);

export default router;
