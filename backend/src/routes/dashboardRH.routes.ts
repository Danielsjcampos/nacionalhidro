import { Router } from 'express';
import { getDashboardRH } from '../controllers/dashboardRH.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/stats', getDashboardRH);

export default router;
