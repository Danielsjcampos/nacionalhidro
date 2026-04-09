import { Router } from 'express';
import { listClientes, createCliente, getCliente, updateCliente, deleteCliente, getHierarquia } from '../controllers/cliente.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listClientes);
router.post('/', createCliente);
router.get('/:id', getCliente);
router.patch('/:id', updateCliente);
router.delete('/:id', deleteCliente);
router.get('/:id/hierarquia', getHierarquia);

export default router;
