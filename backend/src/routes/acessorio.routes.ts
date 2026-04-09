import { Router } from 'express';
import { getAcessorios, createAcessorio, updateAcessorio, deleteAcessorio } from '../controllers/acessorio.controller';

const router = Router();

router.get('/', getAcessorios);
router.post('/', createAcessorio);
router.put('/:id', updateAcessorio);
router.delete('/:id', deleteAcessorio);

export default router;
