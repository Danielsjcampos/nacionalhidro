import { Router } from 'express';
import {
    listOS, getOS, createOS, updateOS, deleteOS, printOS, downloadPdfOS, printLoteOSPdf,
    listItensCobranca, createItemCobranca, updateItemCobranca, deleteItemCobranca,
    duplicateOS, createOSLote, baixarOSLote,
    finalizarOS, reverterCancelamentoOS, sincronizarRDOComItensCobranca
} from '../controllers/os.controller';
import { listMateriaisOS, addMaterialOS, removeMaterialOS } from '../controllers/materialOS.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// ── OS CRUD ──────────────────────────────────────────────────────
router.get('/', listOS);
router.get('/exportar/lote-pdf', printLoteOSPdf);
router.get('/:id', getOS);
router.post('/', createOS);
router.post('/print', printOS);
router.get('/:id/pdf', downloadPdfOS);
router.patch('/:id', updateOS);
router.delete('/:id', deleteOS);

// ── Duplicar OS ──────────────────────────────────────────────────
router.post('/:id/duplicar', duplicateOS);
router.post('/:id/sync-rdo', sincronizarRDOComItensCobranca);

// ── Gap Analysis 2.6: Finalizar + Reverter Cancelamento ──────────
router.patch('/:id/finalizar', finalizarOS);
router.patch('/:id/reverter-cancelamento', reverterCancelamentoOS);

// ── Lote (criar e baixar) ────────────────────────────────────────
router.post('/lote', createOSLote);
router.patch('/baixar-lote', baixarOSLote);

// ── Itens de Cobrança (subitens para hora extra, noturno, etc.) ──
router.get('/:osId/itens-cobranca', listItensCobranca);
router.post('/:osId/itens-cobranca', createItemCobranca);
router.patch('/itens-cobranca/:itemId', updateItemCobranca);
router.delete('/itens-cobranca/:itemId', deleteItemCobranca);

// ── Materiais Utilizados (T05 — Baixa de Estoque) ────────────────
router.get('/:osId/materiais', listMateriaisOS);
router.post('/:osId/materiais', addMaterialOS);
router.delete('/materiais/:id', removeMaterialOS);

export default router;
