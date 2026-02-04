import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/register', register); // For seeding/dev use

export default router;
