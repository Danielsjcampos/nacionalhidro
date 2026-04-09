import { Router } from 'express';
import { listLogs, getEntityLogs, getLogStats } from '../controllers/auditLog.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listLogs);
router.get('/stats', getLogStats);
router.get('/:entidade/:id', getEntityLogs);

export default router;
