import { Router } from 'express';
import { listPedidos, createPedido, approvePedido, deletePedido } from '../controllers/pedidoCompra.controller';

const router = Router();

router.get('/', listPedidos);
router.post('/', createPedido);
router.patch('/:id/status', approvePedido);
router.delete('/:id', deletePedido);

export default router;
