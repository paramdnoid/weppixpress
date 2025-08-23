import { promises as fsp } from 'fs';
import { join, dirname } from 'path';
import logger from './logger.js';

/**
 * Bereinigt verschachtelte Ordner mit dem gleichen Namen
 * @param {string} rootPath - Root-Pfad zum Durchsuchen
 * @param {number} maxDepth - Maximale Suchtiefe
 */
export async function cleanupNestedFolders(rootPath, maxDepth = 20) {
  logger.info(`Starting cleanup of nested folders in: ${rootPath}`);
  
  let cleanedCount = 0;
  
  async function scanDirectory(currentPath, depth = 0) {
    if (depth > maxDepth) {
      logger.warn(`Max depth reached at: ${currentPath}`);
      return;
    }

    try {
      const entries = await fsp.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const entryPath = join(currentPath, entry.name);
          
          // Prüfe ob der Ordner verschachtelte Duplikate hat
          const nestedPath = await findNestedDuplicate(entryPath, entry.name);
          
          if (nestedPath) {
            logger.info(`Found nested duplicate: ${nestedPath}`);
            await flattenNestedFolder(entryPath, nestedPath);
            cleanedCount++;
          } else {
            // Rekursiv weitersuchen
            await scanDirectory(entryPath, depth + 1);
          }
        }
      }
    } catch (error) {
      logger.error(`Error scanning directory ${currentPath}:`, error);
    }
  }

  await scanDirectory(rootPath);
  logger.info(`Cleanup completed. Cleaned ${cleanedCount} nested folder structures.`);
  return cleanedCount;
}

/**
 * Findet verschachtelte Duplikate eines Ordners
 */
async function findNestedDuplicate(folderPath, folderName) {
  const MAX_NESTING = 50;
  let currentPath = folderPath;
  let nestingCount = 0;
  let deepestPath = folderPath;
  
  while (nestingCount < MAX_NESTING) {
    try {
      const entries = await fsp.readdir(currentPath, { withFileTypes: true });
      
      // Wenn es nur einen Ordner mit dem gleichen Namen gibt
      const sameNameFolders = entries.filter(e => e.isDirectory() && e.name === folderName);
      
      if (sameNameFolders.length === 1 && entries.length === 1) {
        currentPath = join(currentPath, folderName);
        nestingCount++;
        deepestPath = currentPath;
        continue;
      } else {
        // Ende der Verschachtelung gefunden
        if (nestingCount >= 2) { // Mindestens 2 Ebenen tief verschachtelt
          return deepestPath;
        }
        return null;
      }
    } catch (error) {
      return null;
    }
  }
  
  // Wenn MAX_NESTING erreicht, ist es definitiv verschachtelt
  return nestingCount >= 2 ? deepestPath : null;
}

/**
 * Flacht verschachtelte Ordner ab
 */
async function flattenNestedFolder(topFolder, deepestFolder) {
  try {
    // Hole alle Inhalte vom tiefsten Ordner
    const entries = await fsp.readdir(deepestFolder, { withFileTypes: true });
    
    // Verschiebe alle Inhalte zum top-level Ordner
    for (const entry of entries) {
      const sourcePath = join(deepestFolder, entry.name);
      const targetPath = join(topFolder, entry.name);
      
      try {
        await fsp.rename(sourcePath, targetPath);
        logger.debug(`Moved: ${sourcePath} -> ${targetPath}`);
      } catch (error) {
        logger.error(`Failed to move ${sourcePath}:`, error);
      }
    }
    
    // Lösche die verschachtelten Ordner (von innen nach außen)
    let currentPath = deepestFolder;
    while (currentPath !== topFolder && currentPath.length > topFolder.length) {
      try {
        await fsp.rmdir(currentPath);
        logger.debug(`Removed empty nested folder: ${currentPath}`);
        currentPath = dirname(currentPath);
      } catch (error) {
        logger.error(`Failed to remove ${currentPath}:`, error);
        break;
      }
    }
    
    logger.info(`Successfully flattened: ${topFolder}`);
  } catch (error) {
    logger.error(`Error flattening folder ${topFolder}:`, error);
    throw error;
  }
}