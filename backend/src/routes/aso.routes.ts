import { Router } from 'express';
import { listASOs, createASO, updateASO, deleteASO } from '../controllers/aso.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listASOs);       // ?funcionarioId=&tipo=&vencimento=VENCIDO|VENCENDO|OK
router.post('/', createASO);
router.put('/:id', updateASO);
router.delete('/:id', deleteASO);

export default router;
