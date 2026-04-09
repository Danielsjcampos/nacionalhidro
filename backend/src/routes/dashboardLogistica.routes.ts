import { Router } from 'express';
import { getDashboardLogistica } from '../controllers/dashboardLogistica.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getDashboardLogistica);

export default router;
