import { Router } from 'express';
import {
    listPlanoContas, listPlanoContasFlat,
    createPlanoConta, updatePlanoConta, deletePlanoConta,
    seedPlanoContas
} from '../controllers/planoContas.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listPlanoContas);
router.get('/flat', listPlanoContasFlat);
router.post('/', createPlanoConta);
router.post('/seed', seedPlanoContas);
router.patch('/:id', updatePlanoConta);
router.delete('/:id', deletePlanoConta);

export default router;
