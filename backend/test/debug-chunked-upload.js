#!/usr/bin/env node
import { promises as fsp } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Simple debug script to check for orphaned chunk files
async function debugChunkedUploads() {
  console.log('🔍 Debugging chunked upload issues...\n');

  // Check for any temporary chunk directories
  const tempDir = tmpdir();
  console.log(`📁 Checking temp directory: ${tempDir}`);
  
  try {
    const files = await fsp.readdir(tempDir);
    const chunkDirs = files.filter(file => file.includes('.chunks'));
    
    if (chunkDirs.length > 0) {
      console.log(`⚠️  Found ${chunkDirs.length} chunk directories:`);
      for (const dir of chunkDirs) {
        const chunkPath = join(tempDir, dir);
        try {
          const chunkFiles = await fsp.readdir(chunkPath);
          console.log(`  📂 ${dir}: ${chunkFiles.length} chunks`);
          
          // List specific chunks
          for (const chunk of chunkFiles.slice(0, 5)) { // Show first 5
            const stats = await fsp.stat(join(chunkPath, chunk));
            console.log(`    🧩 ${chunk}: ${stats.size} bytes`);
          }
          if (chunkFiles.length > 5) {
            console.log(`    ... and ${chunkFiles.length - 5} more chunks`);
          }
        } catch (error) {
          console.log(`  ❌ Error reading ${dir}: ${error.message}`);
        }
      }
    } else {
      console.log('✅ No orphaned chunk directories found');
    }
  } catch (error) {
    console.log(`❌ Error checking temp directory: ${error.message}`);
  }

  // Check upload directories
  const currentDir = process.cwd();
  const uploadsPath = join(currentDir, 'uploads');
  
  console.log(`\n📁 Checking uploads directory: ${uploadsPath}`);
  
  try {
    await fsp.access(uploadsPath);
    const uploadDirs = await fsp.readdir(uploadsPath);
    
    for (const userDir of uploadDirs) {
      const userPath = join(uploadsPath, userDir);
      const stats = await fsp.stat(userPath);
      
      if (stats.isDirectory()) {
        console.log(`\n👤 User directory: ${userDir}`);
        
        // Look for .chunks directories
        const scanForChunks = async (dir, prefix = '') => {
          try {
            const items = await fsp.readdir(dir);
            
            for (const item of items) {
              const itemPath = join(dir, item);
              const itemStats = await fsp.stat(itemPath);
              
              if (itemStats.isDirectory()) {
                if (item === '.chunks') {
                  console.log(`  ⚠️  Found chunk directory: ${prefix}${item}`);
                  const chunkDirs = await fsp.readdir(itemPath);
                  console.log(`    📊 ${chunkDirs.length} upload sessions`);
                  
                  for (const sessionDir of chunkDirs) {
                    const sessionPath = join(itemPath, sessionDir);
                    try {
                      const chunks = await fsp.readdir(sessionPath);
                      console.log(`    🔄 ${sessionDir}: ${chunks.length} chunks`);
                    } catch (error) {
                      console.log(`    ❌ Error reading session ${sessionDir}: ${error.message}`);
                    }
                  }
                } else {
                  await scanForChunks(itemPath, `${prefix}${item}/`);
                }
              }
            }
          } catch (error) {
            console.log(`    ❌ Error scanning directory: ${error.message}`);
          }
        };
        
        await scanForChunks(userPath);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error checking uploads directory: ${error.message}`);
  }
  
  console.log('\n🏁 Debug complete!');
}

debugChunkedUploads().catch(console.error);