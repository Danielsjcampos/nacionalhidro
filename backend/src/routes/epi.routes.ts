import { Router } from 'express';
import {
    listEPIs, createEPI, updateEPI, deleteEPI,
    listEPIsEntregues, createEPIEntregue, devolverEPI, deleteEPIEntregue
} from '../controllers/epi.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// EPI (Catálogo)
router.get('/', listEPIs);
router.post('/', createEPI);
router.put('/:id', updateEPI);
router.delete('/:id', deleteEPI);

// Entregas de EPI
router.get('/entregas/lista', listEPIsEntregues);
router.post('/entregas', createEPIEntregue);
router.patch('/entregas/:id/devolver', devolverEPI);
router.delete('/entregas/:id', deleteEPIEntregue);

export default router;
