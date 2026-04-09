import { Router } from 'express';
import { listFornecedores, getFornecedor, createFornecedor, updateFornecedor, deleteFornecedor } from '../controllers/fornecedor.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listFornecedores);
router.get('/:id', getFornecedor);
router.post('/', createFornecedor);
router.patch('/:id', updateFornecedor);
router.delete('/:id', deleteFornecedor);

export default router;
