import { Router } from 'express';
import {
  listContasReceber, getContaReceber, createContaReceber,
  updateContaReceber, cancelarContaReceber, validarNota,
  getFaturamentosDisponiveis, receberParcela, salvarParcelaCR
} from '../controllers/contasReceber.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/validar-nota', validarNota);
router.get('/faturamentos', getFaturamentosDisponiveis);
router.get('/', listContasReceber);
router.get('/:id', getContaReceber);
router.post('/', createContaReceber);
router.post('/:id/receber', receberParcela);
router.patch('/parcela/:id', salvarParcelaCR);
router.patch('/:id', updateContaReceber);
router.delete('/:id', cancelarContaReceber);

export default router;
