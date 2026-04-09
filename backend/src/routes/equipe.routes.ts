import { Router } from 'express';
import { 
  listTeam, createMember, updateMember, deleteMember, listCategories 
} from '../controllers/equipe.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/members', listTeam);
router.post('/members', createMember);
router.patch('/members/:id', updateMember);
router.delete('/members/:id', deleteMember);
router.get('/categories', listCategories);

export default router;
