import { Router } from 'express';
import {
    listDesligamentos, getDesligamento, createDesligamento,
    updateDesligamento, moverEtapaDesligamento, deleteDesligamento, getDesligamentoStats
} from '../controllers/desligamento.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listDesligamentos);
router.get('/stats', getDesligamentoStats);
router.get('/:id', getDesligamento);
router.post('/', createDesligamento);
router.patch('/:id/mover', moverEtapaDesligamento);
router.patch('/:id', updateDesligamento);
router.delete('/:id', deleteDesligamento);

export default router;
