import { Router } from 'express';
import { listAllPermissions, getCategoriaPermissoes, updateCategoriaPermissoes } from '../controllers/permissoes.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin.permissoes.editar'), listAllPermissions);
router.get('/categorias/:id', authorize('admin.permissoes.editar'), getCategoriaPermissoes);
router.put('/categorias/:id', authorize('admin.permissoes.editar'), updateCategoriaPermissoes);

export default router;
