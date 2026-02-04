import { Router } from 'express';
import { listClientes, createCliente, getCliente } from '../controllers/cliente.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listClientes);
router.post('/', createCliente);
router.get('/:id', getCliente);

export default router;
