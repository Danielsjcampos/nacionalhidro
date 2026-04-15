import { Router } from 'express';
import WebhookController from '../controllers/webhook.controller';
import FiscalWebhookController from '../controllers/fiscalWebhook.controller';

const router = Router();

// Endpoint genérico para receber leads de formulários externos
router.post('/lead', WebhookController.handleLeadWebhook);

// Endpoints Fiscais (Focus NFe)
router.post('/focus/nfse', FiscalWebhookController.handleNFSeWebhook);
router.post('/focus/cte', FiscalWebhookController.handleCTEWebhook);

// Endpoints específicos para manter compatibilidade, se necessário
router.post('/fluent-forms', WebhookController.handleLeadWebhook);
router.post('/twotime-chat', WebhookController.handleLeadWebhook);

export default router;
