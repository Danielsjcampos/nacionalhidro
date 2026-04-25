import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  getEquipamentos, 
  createEquipamento, 
  updateEquipamento, 
  deleteEquipamento,
  addAcessorioVinculado,
  removeAcessorioVinculado,
  listResponsabilidadesPadrao,
  createResponsabilidadePadrao,
  updateResponsabilidadePadrao,
  deleteResponsabilidadePadrao,
} from '../controllers/equipamento.controller';

const router = Router();

router.use(authenticate);

router.get('/', getEquipamentos);
router.post('/', createEquipamento);
router.put('/:id', updateEquipamento);
router.delete('/:id', deleteEquipamento);

// ─── Acessórios vinculados ──────────────────────────────────────
router.post('/:id/acessorios', addAcessorioVinculado);
router.delete('/:id/acessorios/:vinculoId', removeAcessorioVinculado);

// ─── Responsabilidades padrão ───────────────────────────────────
router.get('/:id/responsabilidades', listResponsabilidadesPadrao);
router.post('/:id/responsabilidades', createResponsabilidadePadrao);
router.put('/:id/responsabilidades/:respId', updateResponsabilidadePadrao);
router.delete('/:id/responsabilidades/:respId', deleteResponsabilidadePadrao);

export default router;
