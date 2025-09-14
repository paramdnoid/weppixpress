import logger from './logger.js';
import { cacheService, databaseService, monitoringService } from '../services/index.js';

export async function gracefulShutdown(server, wsManager, signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  try {
    // Stop monitoring
    if (monitoringService && typeof monitoringService.stopMonitoring === 'function') {
      monitoringService.stopMonitoring();
    }

    // Close WebSocket connections
    if (wsManager && typeof wsManager.close === 'function') {
      wsManager.close();
    }

    // Close server
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        if (cacheService && typeof cacheService.close === 'function') {
          await cacheService.close();
        }
        if (databaseService && typeof databaseService.close === 'function') {
          await databaseService.close();
        }

        logger.info('All connections closed. Process terminated');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}