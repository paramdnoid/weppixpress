#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { cleanupNestedFolders } from '../utils/cleanupNestedFolders.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const uploadDir = process.env.UPLOAD_DIR || resolve(__dirname, '../..', 'uploads');
  
  logger.info('=== Nested Folder Cleanup Script ===');
  logger.info(`Target directory: ${uploadDir}`);
  
  // Direct cleanup of the specific problematic path
  const problematicPath = resolve(uploadDir, 'f0b4f532-7b9c-11f0-b138-f26afbf17c53/test');
  logger.info(`Checking problematic path: ${problematicPath}`);
  
  try {
    await directCleanupPath(problematicPath);
    
    const cleanedCount = await cleanupNestedFolders(uploadDir, 5);
    
    if (cleanedCount > 0) {
      logger.info(`✅ Successfully cleaned ${cleanedCount} nested folder structures`);
    } else {
      logger.info('✅ No nested folders found - directory is clean');
    }
  } catch (error) {
    logger.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

async function directCleanupPath(problematicPath) {
  try {
    const fs = await import('fs/promises');
    await fs.access(problematicPath);
    
    // Lösche den ganzen verschachtelten Pfad und erstelle nur einen 'test' Ordner
    logger.info(`Removing nested path: ${problematicPath}`);
    await fs.rm(problematicPath, { recursive: true, force: true });
    
    // Erstelle einen sauberen 'test' Ordner
    await fs.mkdir(problematicPath);
    logger.info(`Created clean folder: ${problematicPath}`);
    
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.error('Error in direct cleanup:', error);
    }
  }
}

// Führe Script aus wenn direkt aufgerufen
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}