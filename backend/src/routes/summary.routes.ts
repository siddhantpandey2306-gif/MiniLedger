import { Router } from 'express';
import { SummaryController } from '../controllers/summary.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Protect summary route with authentication
router.use(authenticateToken);

// GET /api/summary - Financial metrics for authenticated user
router.get('/', SummaryController.getSummary);

export default router;
