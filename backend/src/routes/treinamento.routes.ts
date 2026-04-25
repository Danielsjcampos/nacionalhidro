import { Router } from 'express';
import {
    listTreinamentos, createTreinamento, updateTreinamento, deleteTreinamento,
    listTreinamentosRealizados, createTreinamentoRealizado, deleteTreinamentoRealizado,
    updateTreinamentoRealizado
} from '../controllers/treinamento.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Treinamentos (Catálogo)
router.get('/', listTreinamentos);
router.post('/', createTreinamento);
router.put('/:id', updateTreinamento);
router.delete('/:id', deleteTreinamento);

// Realização e Certificados
router.get('/realizados/lista', listTreinamentosRealizados);
router.post('/realizados', createTreinamentoRealizado);
router.put('/realizados/:id', updateTreinamentoRealizado);
router.delete('/realizados/:id', deleteTreinamentoRealizado);

export default router;
