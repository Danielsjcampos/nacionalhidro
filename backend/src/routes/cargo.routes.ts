import { Router } from 'express';
import { createCargo, listCargos, deleteCargo, updateCargo } from '../controllers/cargo.controller';

const router = Router();

router.get('/', listCargos);
router.post('/', createCargo);
router.patch('/:id', updateCargo);
router.delete('/:id', deleteCargo);

export default router;
