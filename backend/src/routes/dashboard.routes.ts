import { Router } from 'express';
import { getDashboardStats, getTetoFiscal } from '../controllers/dashboard.controller';

import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, getDashboardStats);
router.get('/teto-fiscal', authenticate, getTetoFiscal);

export default router;
