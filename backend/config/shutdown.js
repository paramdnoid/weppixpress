import logger from '../utils/logger.js';
import cacheService from '../services/cacheService.js';
import databaseService from '../services/databaseService.js';
import monitoringService from '../services/monitoringService.js';
import { closeRateLimiting } from './rateLimiting.js';

export function setupGracefulShutdown(server, wsManager) {
  // Graceful shutdown function
  async function gracefulShutdown(signal) {
    console.log(`${signal} received. Shutting down gracefully...`);
    
    try {
      // Stop monitoring
      monitoringService.stopMonitoring();
      
      // Close WebSocket connections
      wsManager.close();
      
      // Close server
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          await cacheService.close();
          await databaseService.close();
          await closeRateLimiting();
          
          console.log('All connections closed. Process terminated');
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

  // Process signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Global error handlers
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason.message || reason,
      stack: reason.stack,
      promise: promise.toString()
    });
    
    // In production, you might want to gracefully shutdown
    if (process.env.NODE_ENV === 'production') {
      console.error('Unhandled promise rejection. Shutting down gracefully...');
      gracefulShutdown('UNHANDLED_REJECTION');
    }
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    console.error('Uncaught exception. Shutting down...');
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
}