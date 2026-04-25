import { Router } from 'express';
import {
    listMedicoes, getMedicao, createMedicao,
    getMedicaoEmailHistory, updateMedicao, updateMedicaoStatus, gerarPdfMedicaoBaixar, enviarDocumentacaoFinal,
    recalcularMedicao, listOSDisponiveis, fecharPorRDO, enviarAoCliente
} from '../controllers/medicao.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('medicoes.listar'), listMedicoes);
router.get('/os-disponiveis', authorize('medicoes.listar'), listOSDisponiveis);
router.get('/:id', authorize('medicoes.listar'), getMedicao);
router.get('/:id/emails', authorize('medicoes.listar'), getMedicaoEmailHistory);
router.post('/', authorize('medicoes.criar'), createMedicao);
router.post('/fechar-por-rdo', authorize('medicoes.criar'), fecharPorRDO);
router.put('/:id', authorize('medicoes.editar'), updateMedicao);
router.patch('/:id/status', authorize('medicoes.editar'), updateMedicaoStatus);
router.post('/:id/enviar', authorize('medicoes.editar'), enviarAoCliente);
router.post('/:id/enviar-documentacao', authorize('medicoes.editar'), enviarDocumentacaoFinal);
router.post('/:id/recalcular', authorize('medicoes.editar'), recalcularMedicao);
router.get('/:id/pdf', authorize('medicoes.listar'), gerarPdfMedicaoBaixar);
router.post('/:id/pdf', authorize('medicoes.listar'), gerarPdfMedicaoBaixar);

export default router;
