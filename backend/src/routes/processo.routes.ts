import { Router } from 'express';
import { listProcessos, createProcesso, updateProcesso } from '../controllers/processo.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listProcessos);
router.post('/', createProcesso);
router.put('/:id', updateProcesso);

export default router;
