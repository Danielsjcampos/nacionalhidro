import { Router } from 'express';
import {
  listContasReceber, getContaReceber, createContaReceber,
  updateContaReceber, cancelarContaReceber, validarNota,
  getFaturamentosDisponiveis, receberParcela, salvarParcelaCR
} from '../controllers/contasReceber.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/validar-nota', authorize('financeiro.contas_receber.listar'), validarNota);
router.get('/faturamentos', authorize('financeiro.contas_receber.listar'), getFaturamentosDisponiveis);
router.get('/', authorize('financeiro.contas_receber.listar'), listContasReceber);
router.get('/:id', authorize('financeiro.contas_receber.listar'), getContaReceber);
router.post('/', authorize('financeiro.contas_receber.criar'), createContaReceber);
router.post('/:id/receber', authorize('financeiro.contas_receber.editar'), receberParcela);
router.patch('/parcela/:id', authorize('financeiro.contas_receber.editar'), salvarParcelaCR);
router.patch('/:id', authorize('financeiro.contas_receber.editar'), updateContaReceber);
router.delete('/:id', authorize('financeiro.contas_receber.excluir'), cancelarContaReceber);

export default router;
