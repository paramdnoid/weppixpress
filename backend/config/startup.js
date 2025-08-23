import { runMigrations } from '../database/migrate.js';
import cacheService from '../services/cacheService.js';

export async function initializeApplication() {
  if (process.env.NODE_ENV !== 'test') {
    await runMigrations();
    await cacheService.initialize();
  }
}