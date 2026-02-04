import { Router } from 'express';
import { listCategorias, createCategoria, updateCategoria, deleteCategoria } from '../controllers/categoria.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listCategorias);
router.post('/', createCategoria);
router.patch('/:id', updateCategoria);
router.delete('/:id', deleteCategoria);

export default router;
