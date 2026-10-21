import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

export const errorHandler = (
  err: Error | AppError | DatabaseError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // 1. Handle custom application errors
  if ('statusCode' in err && typeof err.statusCode === 'number') {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // 2. Handle known PostgreSQL database error codes
  if ('code' in err && typeof err.code === 'string') {
    switch (err.code) {
      case '23505': // Unique constraint violation
        res.status(409).json({
          success: false,
          error: 'A record with this unique identifier already exists.',
        });
        return;

      case '23503': // Foreign key constraint violation
        res.status(400).json({
          success: false,
          error: 'Referenced user or related entity does not exist.',
        });
        return;

      case '23514': // Check constraint violation (e.g. amount > 0)
        res.status(400).json({
          success: false,
          error: 'Database constraint violation. Ensure amounts are greater than zero.',
        });
        return;

      case '22P02': // Invalid data type syntax (e.g. malformed UUID)
        res.status(400).json({
          success: false,
          error: 'Invalid input format (e.g. invalid UUID format).',
        });
        return;
    }
  }

  // 3. Fallback for unexpected 500 server errors
  console.error('[UNEXPECTED SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error. Please try again later.',
  });
};
