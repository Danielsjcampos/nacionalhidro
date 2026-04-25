import { Router } from 'express';
import { listNaturezas, createNatureza, updateNatureza, deleteNatureza } from '../controllers/natureza.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listNaturezas);
router.post('/', createNatureza);
router.patch('/:id', updateNatureza);
router.delete('/:id', deleteNatureza);

export default router;
