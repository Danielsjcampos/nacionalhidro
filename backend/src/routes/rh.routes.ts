import { Router } from 'express';
import {
    listFuncionarios, getFuncionario, createFuncionario, updateFuncionario,
    createAfastamento, listAfastamentos, deleteAfastamento,
    createIntegracao, listIntegracoes, deleteIntegracao,
    getDisponibilidade, getResumoRH, getAttendanceToday, checkCompliance
} from '../controllers/rh.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Funcionários CRUD
router.get('/', listFuncionarios);
router.get('/resumo', getResumoRH);
router.get('/attendance/today', getAttendanceToday);
router.get('/disponibilidade', getDisponibilidade);
router.get('/:id', getFuncionario);
router.get('/:funcionarioId/compliance-check', checkCompliance);
router.post('/', createFuncionario);
router.put('/:id', updateFuncionario);

// Afastamentos
router.get('/:id/afastamentos', listAfastamentos);
router.post('/:id/afastamentos', createAfastamento);
router.delete('/:id/afastamentos/:afastamentoId', deleteAfastamento);

// Integrações
router.get('/:id/integracoes', listIntegracoes);
router.post('/:id/integracoes', createIntegracao);
router.delete('/:id/integracoes/:integracaoId', deleteIntegracao);

export default router;
