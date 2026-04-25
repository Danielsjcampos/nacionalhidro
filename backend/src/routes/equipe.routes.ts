import { Router } from 'express';
import { 
  listTeam, createMember, updateMember, deleteMember, listCategories 
} from '../controllers/equipe.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/members', authorize('admin.usuarios.ver'), listTeam);
router.post('/members', authorize('admin.usuarios.criar'), createMember);
router.patch('/members/:id', authorize('admin.usuarios.editar'), updateMember);
router.delete('/members/:id', authorize('admin.usuarios.excluir'), deleteMember);
router.get('/categories', authorize('admin.usuarios.ver'), listCategories);

export default router;
