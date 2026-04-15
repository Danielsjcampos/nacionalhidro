import { Router } from 'express';
import {
    listFaturamentos, getFaturamento, createFaturamento,
    updateFaturamento, deleteFaturamento, gerarFaturamentoRL,
    getFaturamentoStats, emitirManual, consultarStatusManual,
    cancelarManual, emitirCartaCorrecao, enviarFaturamentoAoCliente
} from '../controllers/faturamento.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/stats', getFaturamentoStats);
router.get('/', listFaturamentos);
router.get('/:id', getFaturamento);
router.post('/', createFaturamento);
router.post('/gerar-rl', gerarFaturamentoRL);
router.post('/:id/enviar', enviarFaturamentoAoCliente);
router.post('/:id/emitir', emitirManual);
router.post('/:id/cancelar', cancelarManual);
router.post('/:id/carta-correcao', emitirCartaCorrecao);
router.get('/:id/status', consultarStatusManual);
router.patch('/:id', updateFaturamento);
router.delete('/:id', deleteFaturamento);

export default router;
