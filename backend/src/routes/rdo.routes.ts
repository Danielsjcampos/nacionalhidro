import { Router } from 'express';
import {
    listRDOs, getRDO, createRDO, updateRDO, deleteRDO, listRDOsByOS
} from '../controllers/rdo.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listRDOs);
router.get('/:id', getRDO);
router.post('/', createRDO);
router.patch('/:id', updateRDO);
router.delete('/:id', deleteRDO);
router.get('/os/:osId', listRDOsByOS);

export default router;
