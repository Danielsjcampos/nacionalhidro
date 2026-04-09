import { Router } from 'express';
import { getDashboardFinanceiro } from '../controllers/dashboardFinanceiro.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', getDashboardFinanceiro);

export default router;
