import { Router } from 'express';
import { getDashboardRH, getAlertasDetalhados } from '../controllers/dashboardRH.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/stats', getDashboardRH);
router.get('/detalhes', getAlertasDetalhados);

export default router;
