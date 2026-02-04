import { Router } from 'express';
import { 
  listPropostas, getProposta, createProposta, updateProposta, 
  updatePropostaStatus, deleteProposta 
} from '../controllers/proposta.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listPropostas);
router.get('/:id', getProposta);
router.post('/', createProposta);
router.patch('/:id', updateProposta);
router.patch('/:id/status', updatePropostaStatus);
router.delete('/:id', deleteProposta);

export default router;
