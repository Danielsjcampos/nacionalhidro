import { Router } from 'express';
import {
  listProdutos, createProduto, updateProduto, deleteProduto,
  updateEstoque, consumoOS, getAlertasEstoque, getMovimentacoes
} from '../controllers/estoque.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// T06: Low stock alerts (MUST be before /:id routes)
router.get('/alertas', getAlertasEstoque);

// T05: OS material consumption (bulk, MUST be before /:id routes)
router.post('/consumo-os', consumoOS);

// Product CRUD
router.get('/', listProdutos);
router.post('/', createProduto);
router.patch('/:id', updateProduto);
router.delete('/:id', deleteProduto);

// Stock movements
router.post('/:id/movimentacao', updateEstoque);
router.get('/:id/movimentacoes', getMovimentacoes);

export default router;
