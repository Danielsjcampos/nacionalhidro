import { Router } from 'express';
import {
  listProdutos, createProduto, updateProduto, deleteProduto,
  updateEstoque, consumoOS, getAlertasEstoque, getMovimentacoes
} from '../controllers/estoque.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Alertas
router.get('/alertas', authorize('estoque.listar'), getAlertasEstoque);

// Consumo OS
router.post('/consumo-os', authorize('estoque.movimentar'), consumoOS);

// Product CRUD
router.get('/', authorize('estoque.listar'), listProdutos);
router.post('/', authorize('estoque.movimentar'), createProduto);
router.patch('/:id', authorize('estoque.movimentar'), updateProduto);
router.delete('/:id', authorize('estoque.movimentar'), deleteProduto);

// Stock movements
router.post('/:id/movimentacao', authorize('estoque.movimentar'), updateEstoque);
router.get('/:id/movimentacoes', authorize('estoque.listar'), getMovimentacoes);

export default router;
