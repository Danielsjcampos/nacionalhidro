import { Router } from 'express';
import { getDashboardStats, getTetoFiscal } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Dashboard is accessible to any authenticated user, but data is filtered
// inside getDashboardStats based on the user's granular permissions
router.get('/stats', authenticate, getDashboardStats);
router.get('/teto-fiscal', authenticate, getTetoFiscal);

export default router;
