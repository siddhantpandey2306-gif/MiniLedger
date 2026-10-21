import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/db';

const router = Router();

// GET /api/health - Public health check endpoint verifying server and database connectivity
router.get('/', async (req: Request, res: Response) => {
  const isDbConnected = await checkDatabaseConnection();

  const statusCode = isDbConnected ? 200 : 503;

  res.status(statusCode).json({
    status: isDbConnected ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      database: isDbConnected ? 'connected' : 'disconnected',
    },
  });
});

export default router;
