import { Router } from 'express';
import {
  listContasPagar, getContaPagar, createContaPagar,
  updateContaPagar, cancelarContaPagar, validarNF,
  pagarParcela, salvarParcela, importarContas
} from '../controllers/contasPagar.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/validar-nf', authorize('financeiro.contas_pagar.listar'), validarNF);
router.get('/', authorize('financeiro.contas_pagar.listar'), listContasPagar);
router.get('/:id', authorize('financeiro.contas_pagar.listar'), getContaPagar);
router.post('/', authorize('financeiro.contas_pagar.criar'), createContaPagar);
router.post('/importar', authorize('financeiro.contas_pagar.criar'), importarContas);
router.post('/:id/pagar', authorize('financeiro.contas_pagar.editar'), pagarParcela);
router.patch('/parcela/:id', authorize('financeiro.contas_pagar.editar'), salvarParcela);
router.patch('/:id', authorize('financeiro.contas_pagar.editar'), updateContaPagar);
router.delete('/:id', authorize('financeiro.contas_pagar.excluir'), cancelarContaPagar);

export default router;
