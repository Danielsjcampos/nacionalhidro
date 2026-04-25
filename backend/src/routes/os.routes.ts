import { Router } from 'express';
import {
    listOS, getOS, createOS, updateOS, deleteOS, printOS, downloadPdfOS, printLoteOSPdf,
    listItensCobranca, createItemCobranca, updateItemCobranca, deleteItemCobranca,
    duplicateOS, createOSLote, baixarOSLote,
    finalizarOS, reverterCancelamentoOS, sincronizarRDOComItensCobranca
} from '../controllers/os.controller';
import { listMateriaisOS, addMaterialOS, removeMaterialOS } from '../controllers/materialOS.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// ── OS CRUD ──────────────────────────────────────────────────────
router.get('/', authorize('logistica.os.listar'), listOS);
router.get('/exportar/lote-pdf', authorize('logistica.os.listar'), printLoteOSPdf);
router.get('/:id', authorize('logistica.os.listar'), getOS);
router.post('/', authorize('logistica.os.criar'), createOS);
router.post('/print', authorize('logistica.os.listar'), printOS);
router.get('/:id/pdf', authorize('logistica.os.listar'), downloadPdfOS);
router.patch('/:id', authorize('logistica.os.editar'), updateOS);
router.delete('/:id', authorize('logistica.os.excluir'), deleteOS);

// ── Duplicar OS ──────────────────────────────────────────────────
router.post('/:id/duplicar', authorize('logistica.os.criar'), duplicateOS);
router.post('/:id/sync-rdo', authorize('logistica.os.editar'), sincronizarRDOComItensCobranca);

// ── Finalizar + Reverter Cancelamento ──────────
router.patch('/:id/finalizar', authorize('logistica.os.editar'), finalizarOS);
router.patch('/:id/reverter-cancelamento', authorize('logistica.os.editar'), reverterCancelamentoOS);

// ── Lote (criar e baixar) ────────────────────────────────────────
router.post('/lote', authorize('logistica.os.criar'), createOSLote);
router.patch('/baixar-lote', authorize('logistica.os.editar'), baixarOSLote);

// ── Itens de Cobrança ──
router.get('/:osId/itens-cobranca', authorize('logistica.os.listar'), listItensCobranca);
router.post('/:osId/itens-cobranca', authorize('logistica.os.editar'), createItemCobranca);
router.patch('/itens-cobranca/:itemId', authorize('logistica.os.editar'), updateItemCobranca);
router.delete('/itens-cobranca/:itemId', authorize('logistica.os.excluir'), deleteItemCobranca);

// ── Materiais Utilizados ────────────────
router.get('/:osId/materiais', authorize('logistica.os.listar'), listMateriaisOS);
router.post('/:osId/materiais', authorize('logistica.os.editar'), addMaterialOS);
router.delete('/materiais/:id', authorize('logistica.os.excluir'), removeMaterialOS);

export default router;
