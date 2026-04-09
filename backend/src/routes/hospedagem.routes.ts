import { Router } from 'express';
import {
    listHospedagens, createHospedagem, updateHospedagem, deleteHospedagem,
    listPassagens, createPassagem, updatePassagem, deletePassagem,
    getResumoViagem
} from '../controllers/hospedagem.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// Hospedagens
router.get('/', listHospedagens);
router.post('/', createHospedagem);
router.patch('/:id', updateHospedagem);
router.delete('/:id', deleteHospedagem);

// Passagens
router.get('/passagens', listPassagens);
router.post('/passagens', createPassagem);
router.patch('/passagens/:id', updatePassagem);
router.delete('/passagens/:id', deletePassagem);

// Resumo por OS
router.get('/resumo/:osId', getResumoViagem);

export default router;
