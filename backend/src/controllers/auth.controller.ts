import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body;
      const result = await AuthService.requestOtp(phone);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp } = req.body;
      const result = await AuthService.verifyOtp(phone, otp);
      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
}
