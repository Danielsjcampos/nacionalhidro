import { Router } from 'express';
import {
    listFuncionarios, getFuncionario, createFuncionario, updateFuncionario,
    createAfastamento, listAfastamentos, deleteAfastamento,
    createIntegracao, listIntegracoes, deleteIntegracao,
    getDisponibilidade, getResumoRH, getAttendanceToday, checkCompliance
} from '../controllers/rh.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Funcionários CRUD
router.get('/', authorize('rh.funcionarios.listar'), listFuncionarios);
router.get('/resumo', authorize('rh.funcionarios.listar'), getResumoRH);
router.get('/attendance/today', authorize('rh.funcionarios.listar'), getAttendanceToday);
router.get('/disponibilidade', authorize('rh.funcionarios.listar'), getDisponibilidade);
router.get('/:id', authorize('rh.funcionarios.listar'), getFuncionario);
router.get('/:funcionarioId/compliance-check', authorize('rh.funcionarios.listar'), checkCompliance);
router.post('/', authorize('rh.funcionarios.criar'), createFuncionario);
router.put('/:id', authorize('rh.funcionarios.editar'), updateFuncionario);

// Afastamentos
router.get('/:id/afastamentos', authorize('rh.funcionarios.listar'), listAfastamentos);
router.post('/:id/afastamentos', authorize('rh.funcionarios.editar'), createAfastamento);
router.delete('/:id/afastamentos/:afastamentoId', authorize('rh.funcionarios.editar'), deleteAfastamento);

// Integrações
router.get('/:id/integracoes', authorize('rh.funcionarios.listar'), listIntegracoes);
router.post('/:id/integracoes', authorize('rh.funcionarios.editar'), createIntegracao);
router.delete('/:id/integracoes/:integracaoId', authorize('rh.funcionarios.editar'), deleteIntegracao);

export default router;
