import { Router } from 'express';
import authRoutes from './auth.routes';
import loanRoutes from './loan.routes';
import summaryRoutes from './summary.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/loans', loanRoutes);
router.use('/summary', summaryRoutes);
router.use('/health', healthRoutes);

export default router;
