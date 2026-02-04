import { Router } from 'express';
import { listOS, getOS, createOS, updateOS, deleteOS } from '../controllers/os.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listOS);
router.get('/:id', getOS);
router.post('/', createOS);
router.patch('/:id', updateOS);
router.delete('/:id', deleteOS);

export default router;
