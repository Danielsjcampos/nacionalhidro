import { Router } from 'express';
import {
    listMedicoes, getMedicao, createMedicao,
    updateMedicaoStatus, listOSDisponiveis, fecharPorRDO, enviarAoCliente,
    getMedicaoEmailHistory, updateMedicao, gerarPdfMedicaoBaixar
} from '../controllers/medicao.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listMedicoes);
router.get('/os-disponiveis', listOSDisponiveis);
router.get('/:id', getMedicao);
router.get('/:id/emails', getMedicaoEmailHistory);
router.post('/', createMedicao);
router.post('/fechar-por-rdo', fecharPorRDO);
router.put('/:id', updateMedicao);
router.patch('/:id/status', updateMedicaoStatus);
router.post('/:id/enviar', enviarAoCliente);
router.post('/:id/pdf', gerarPdfMedicaoBaixar);

export default router;
