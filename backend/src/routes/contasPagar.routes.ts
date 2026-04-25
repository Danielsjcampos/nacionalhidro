import { Router } from 'express';
import {
  listContasPagar, getContaPagar, createContaPagar,
  updateContaPagar, cancelarContaPagar, validarNF,
  pagarParcela, salvarParcela, importarContas
} from '../controllers/contasPagar.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/validar-nf', validarNF);
router.get('/', listContasPagar);
router.get('/:id', getContaPagar);
router.post('/', createContaPagar);
router.post('/importar', importarContas);
router.post('/:id/pagar', pagarParcela);
router.patch('/parcela/:id', salvarParcela);
router.patch('/:id', updateContaPagar);
router.delete('/:id', cancelarContaPagar);

export default router;
