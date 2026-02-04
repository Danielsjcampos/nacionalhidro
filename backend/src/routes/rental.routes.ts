import { Router } from 'express';
import * as RentalController from '../controllers/rental.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all rental routes
router.use(authenticate);

// Properties
router.get('/properties', RentalController.listProperties);
router.post('/properties', RentalController.createProperty);

// Contracts
router.get('/contracts', RentalController.listContracts);
router.post('/contracts', RentalController.createContract);

export default router;
