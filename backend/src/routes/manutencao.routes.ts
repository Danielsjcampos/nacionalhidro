import { Router } from 'express';
import { 
  listManutencoes, createManutencao, updateManutencao, deleteManutencao,
  liberarVeiculo 
} from '../controllers/manutencao.controller';
import { listPecasManutencao, addPecaManutencao, removePecaManutencao } from '../controllers/pecaManutencao.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listManutencoes);
router.post('/', createManutencao);
router.patch('/:id', updateManutencao);
router.patch('/:id/liberar', liberarVeiculo);
router.delete('/:id', deleteManutencao);

// ── Peças Utilizadas (T06 — Baixa de Estoque) ────────────────────
router.get('/:manutencaoId/pecas', listPecasManutencao);
router.post('/:manutencaoId/pecas', addPecaManutencao);
router.delete('/pecas/:id', removePecaManutencao);

export default router;
