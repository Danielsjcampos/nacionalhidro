import { Router } from 'express';
import { getLeads, createLead, updateLeadStatus, updateLead, deleteLead } from '../controllers/crm.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/leads', authenticate, getLeads);
router.post('/leads', authenticate, createLead);
router.patch('/leads/:id/status', authenticate, updateLeadStatus);
router.patch('/leads/:id', authenticate, updateLead);
router.delete('/leads/:id', authenticate, deleteLead);

export default router;
