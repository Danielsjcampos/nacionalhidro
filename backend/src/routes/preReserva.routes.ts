import { Router } from 'express';
import { listPreReservas, createPreReserva, confirmarPreReserva, cancelarPreReserva, checkDisponibilidade } from '../controllers/preReserva.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listPreReservas);                              // GET  /pre-reservas
router.post('/', createPreReserva);                             // POST /pre-reservas
router.patch('/:id/confirmar', confirmarPreReserva);            // PATCH /pre-reservas/:id/confirmar
router.patch('/:id/cancelar', cancelarPreReserva);              // PATCH /pre-reservas/:id/cancelar
router.get('/disponibilidade', checkDisponibilidade);           // GET  /pre-reservas/disponibilidade?data=...&equipamentoTipo=...

export default router;
