import cron from 'node-cron';
import uploadController from '../controllers/uploadController.js';
import logger from '../utils/logger.js';

class UploadCleanupService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Upload cleanup service is already running');
      return;
    }

    logger.info('Starting upload cleanup service...');
    
    // Run cleanup every hour
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.performCleanup();
    });

    // Run initial cleanup on startup (delayed by 30 seconds)
    setTimeout(() => {
      this.performCleanup();
    }, 30000);

    this.isRunning = true;
    logger.info('Upload cleanup service started successfully');
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Upload cleanup service is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }

    this.isRunning = false;
    logger.info('Upload cleanup service stopped');
  }

  async performCleanup() {
    const startTime = Date.now();
    
    try {
      logger.info('Starting periodic upload cleanup...');
      
      const cleanedCount = await uploadController.cleanupExpiredSessions();
      
      const duration = Date.now() - startTime;
      logger.info(`Upload cleanup completed: ${cleanedCount} expired sessions cleaned in ${duration}ms`);
      
      // Log performance metrics
      if (global.performanceMonitor) {
        global.performanceMonitor.recordMetric('upload_cleanup_duration', duration);
        global.performanceMonitor.recordMetric('upload_cleanup_sessions_cleaned', cleanedCount);
      }
      
    } catch (error) {
      logger.error('Upload cleanup failed:', error);
      
      if (global.errorReporter) {
        global.errorReporter.reportError(error, {
          context: 'upload_cleanup_service',
          severity: 'medium'
        });
      }
    }
  }

  async manualCleanup() {
    logger.info('Manual upload cleanup requested');
    return await this.performCleanup();
  }

  getStatus() {
    return {
      running: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.options.scheduled : null
    };
  }
}

export default new UploadCleanupService();