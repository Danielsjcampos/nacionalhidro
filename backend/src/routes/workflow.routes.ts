import { Router } from 'express';
import { 
  listWorkflows, 
  getWorkflow, 
  upsertCard, 
  moveCard, 
  bootstrapFromPipefy, 
  updateFields 
} from '../controllers/workflow.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Rotas Públicas (Sem Autenticação)
router.get('/public/:id', getPublicWorkflow);
router.post('/public/apply', createPublicCard);

router.use(authenticate);

router.get('/', listWorkflows);
router.get('/:id', getWorkflow);
router.post('/card', upsertCard);
router.put('/card/:id', upsertCard);
router.patch('/card/:cardId/move', moveCard);
router.post('/bootstrap', bootstrapFromPipefy);
router.put('/:workflowId/fields', updateFields);

export default router;
