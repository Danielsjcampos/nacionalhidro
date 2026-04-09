import { Router } from 'express';
import {
    listOSPrecificacao, getOSPrecificacao,
    addItemCobranca, removeItemCobranca,
    precificarOS, baixarOS, autoCalcularItens
} from '../controllers/precificacao.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listOSPrecificacao);
router.get('/:id', getOSPrecificacao);
router.post('/:id/itens', addItemCobranca);
router.delete('/:id/itens/:itemId', removeItemCobranca);
router.post('/:id/precificar', precificarOS);
router.post('/:id/baixar', baixarOS);
router.post('/:id/auto-calcular', autoCalcularItens);

export default router;
