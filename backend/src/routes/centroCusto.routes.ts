import { Router } from 'express';
import { listCentrosCusto, createCentroCusto, createLancamento, deleteCentroCusto } from '../controllers/centroCusto.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listCentrosCusto);
router.post('/', createCentroCusto);
router.post('/lancamentos', createLancamento);
router.delete('/:id', deleteCentroCusto);

export default router;
