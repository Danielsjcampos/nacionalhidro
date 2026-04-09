import { Router } from 'express';
import {
    listContasBancarias,
    getSaldosContas,
    createContaBancaria,
    updateContaBancaria,
    deleteContaBancaria,
} from '../controllers/contaBancaria.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('', listContasBancarias);
router.get('/saldos', getSaldosContas);
router.post('', createContaBancaria);
router.patch('/:id', updateContaBancaria);
router.delete('/:id', deleteContaBancaria);

export default router;
