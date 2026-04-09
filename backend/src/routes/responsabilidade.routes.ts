import { Router } from 'express';
import { getResponsabilidades, createResponsabilidade, updateResponsabilidade, deleteResponsabilidade } from '../controllers/responsabilidade.controller';

const router = Router();

router.get('/', getResponsabilidades);
router.post('/', createResponsabilidade);
router.put('/:id', updateResponsabilidade);
router.delete('/:id', deleteResponsabilidade);

export default router;
