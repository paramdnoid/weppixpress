import cacheService from './cacheService.js';
import databaseService from './databaseService.js';
import monitoringService from './monitoringService.js';
import { runMigrations } from '../database/migrate.js';
import { serverConfig } from '../../config/index.js';

export async function initializeServices() {
  if (serverConfig.nodeEnv !== 'test') {
    await runMigrations();
    await cacheService.initialize();
  }
}

export {
  cacheService,
  databaseService,
  monitoringService
};