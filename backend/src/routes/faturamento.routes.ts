import { Router } from 'express';
import {
    listFaturamentos, getFaturamento, createFaturamento,
    updateFaturamento, deleteFaturamento, gerarFaturamentoRL,
    getFaturamentoStats, emitirNFSeManual, consultarStatusNFSe,
    cancelarNFSeManual, emitirCartaCorrecao, enviarFaturamentoAoCliente
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
router.post('/:id/emitir-nfse', emitirNFSeManual);
router.post('/:id/cancelar-nfse', cancelarNFSeManual);
router.post('/:id/carta-correcao', emitirCartaCorrecao);
router.get('/:id/status-nfse', consultarStatusNFSe);
router.patch('/:id', updateFaturamento);
router.delete('/:id', deleteFaturamento);

export default router;
