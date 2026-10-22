import app from './app';
import { config } from './config/env';
import { ensureDatabaseConnection } from './config/db';

const startServer = async () => {
  await ensureDatabaseConnection();

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`MiniLedger Backend Service Running`);
    console.log(`Port:        ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Health Check: http://localhost:${config.port}/api/health`);
    console.log(`====================================================`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
};

startServer();
