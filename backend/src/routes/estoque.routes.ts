import { Router } from 'express';
import { listProdutos, updateEstoque } from '../controllers/estoque.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listProdutos);
router.post('/:id/movimentacao', updateEstoque);

export default router;
