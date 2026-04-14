import { Router } from 'express';
import { 
  listWorkflows, 
  getWorkflow, 
  upsertCard, 
  moveCard, 
  bootstrapFromPipefy, 
  updateFields 
} from '../controllers/workflow.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', listWorkflows);
router.get('/:id', getWorkflow);
router.post('/card', upsertCard);
router.put('/card/:id', upsertCard);
router.patch('/card/:cardId/move', moveCard);
router.post('/bootstrap', bootstrapFromPipefy);
router.put('/:workflowId/fields', updateFields);

export default router;
