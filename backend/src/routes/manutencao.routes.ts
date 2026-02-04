import { Router } from 'express';
import { 
  listManutencoes, createManutencao, updateManutencao, deleteManutencao,
  liberarVeiculo 
} from '../controllers/manutencao.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listManutencoes);
router.post('/', createManutencao);
router.patch('/:id', updateManutencao);
router.patch('/:id/liberar', liberarVeiculo);
router.delete('/:id', deleteManutencao);

export default router;
