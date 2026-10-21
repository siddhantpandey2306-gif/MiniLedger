import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthRequest } from '../types';

interface JwtPayload {
  id: string;
  phone: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Access denied. Missing or malformed Bearer authorization token.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    if (!decoded || !decoded.id) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload.',
      });
      return;
    }

    // Attach verified user information to the request object.
    // The user ID is strictly derived from the verified token payload.
    req.user = {
      id: decoded.id,
      phone_number: decoded.phone,
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: err.name === 'TokenExpiredError' ? 'Token expired. Please log in again.' : 'Invalid token signature.',
    });
  }
};
