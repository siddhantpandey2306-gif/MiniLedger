import { Router } from 'express';
import { LoanController } from '../controllers/loan.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate';
import { createLoanSchema, getLoansQuerySchema } from '../validators/loan.validator';

const router = Router();

// Protect all loan routes with authentication
router.use(authenticateToken);

// GET /api/loans - List authenticated user's loans
router.get('/', validateQuery(getLoansQuerySchema), LoanController.getLoans);

// POST /api/loans - Create new loan entry
router.post('/', validateBody(createLoanSchema), LoanController.createLoan);

// PATCH /api/loans/:id/repay - Mark loan as repaid
router.patch('/:id/repay', LoanController.repayLoan);

export default router;
