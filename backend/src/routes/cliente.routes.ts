import { Router } from 'express';
import { listClientes, createCliente, getCliente, updateCliente, deleteCliente, getHierarquia } from '../controllers/cliente.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize('comercial.clientes.listar'), listClientes);
router.post('/', authorize('comercial.clientes.criar'), createCliente);
router.get('/:id', authorize('comercial.clientes.listar'), getCliente);
router.patch('/:id', authorize('comercial.clientes.editar'), updateCliente);
router.delete('/:id', authorize('comercial.clientes.editar'), deleteCliente);
router.get('/:id/hierarquia', authorize('comercial.clientes.listar'), getHierarquia);

export default router;
