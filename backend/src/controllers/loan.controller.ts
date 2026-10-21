import { Response, NextFunction } from 'express';
import { LoanService } from '../services/loan.service';
import { AuthRequest } from '../types';

export class LoanController {
  static async getLoans(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const status = req.query.status as string | undefined;
      const loans = await LoanService.getLoans(userId, status);

      res.status(200).json({
        success: true,
        count: loans.length,
        data: loans,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createLoan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const loan = await LoanService.createLoan(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Loan entry created successfully',
        data: loan,
      });
    } catch (error) {
      next(error);
    }
  }

  static async repayLoan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const loanId = req.params.id;
      const loan = await LoanService.repayLoan(userId, loanId);

      res.status(200).json({
        success: true,
        message: 'Loan marked as repaid successfully',
        data: loan,
      });
    } catch (error) {
      next(error);
    }
  }
}
