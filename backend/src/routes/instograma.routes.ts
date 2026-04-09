import { Router } from 'express';
import { listInstograma, reagendarEscala, getDisponibilidade, sugerirEscalaIA } from '../controllers/instograma.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// GET /instograma?startDate=...&endDate=...
router.get('/', listInstograma);

// GET /instograma/disponibilidade?date=...
router.get('/disponibilidade', getDisponibilidade);

// PATCH /instograma/:id — reagendar escala
router.patch('/:id', reagendarEscala);

// POST /instograma/ia-sugerir
router.post('/ia-sugerir', sugerirEscalaIA);

export default router;
