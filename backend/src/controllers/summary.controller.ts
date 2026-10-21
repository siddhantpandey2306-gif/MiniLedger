import { Response, NextFunction } from 'express';
import { LoanService } from '../services/loan.service';
import { AuthRequest } from '../types';

export class SummaryController {
  static async getSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const summary = await LoanService.getSummary(userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}
