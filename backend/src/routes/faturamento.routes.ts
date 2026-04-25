import { Router } from 'express';
import {
    listFaturamentos, getFaturamento, createFaturamento,
    updateFaturamento, deleteFaturamento, gerarFaturamentoRL,
    getFaturamentoStats, emitirManual, consultarStatusManual,
    cancelarManual, emitirCartaCorrecao, enviarFaturamentoAoCliente
} from '../controllers/faturamento.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/stats', authorize('financeiro.faturamento.listar'), getFaturamentoStats);
router.get('/', authorize('financeiro.faturamento.listar'), listFaturamentos);
router.get('/:id', authorize('financeiro.faturamento.listar'), getFaturamento);
router.post('/', authorize('financeiro.faturamento.criar'), createFaturamento);
router.post('/gerar-rl', authorize('financeiro.faturamento.criar'), gerarFaturamentoRL);
router.post('/:id/enviar', authorize('financeiro.faturamento.criar'), enviarFaturamentoAoCliente);
router.post('/:id/emitir', authorize('financeiro.faturamento.criar'), emitirManual);
router.post('/:id/cancelar', authorize('financeiro.faturamento.criar'), cancelarManual);
router.post('/:id/carta-correcao', authorize('financeiro.faturamento.criar'), emitirCartaCorrecao);
router.get('/:id/status', authorize('financeiro.faturamento.listar'), consultarStatusManual);
router.patch('/:id', authorize('financeiro.faturamento.criar'), updateFaturamento);
router.delete('/:id', authorize('financeiro.faturamento.criar'), deleteFaturamento);

export default router;
