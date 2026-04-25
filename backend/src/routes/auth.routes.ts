import { Router } from 'express';
import { login, register, forgotPassword, resetPassword, getRole } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/get-role/:userId', getRole);

export default router;
