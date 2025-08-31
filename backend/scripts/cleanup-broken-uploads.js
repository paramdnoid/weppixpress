#!/usr/bin/env node
import { promises as fsp } from 'fs';
import { join, dirname } from 'path';

// Cleanup script for broken upload directories
async function cleanupBrokenUploads() {
  console.log('🧹 Cleaning up broken upload directories...\n');

  const uploadsPath = '/Users/andre/Projects/weppixpress/uploads/89904462-8022-11f0-b141-f26afbf17c52/teste';
  
  try {
    const items = await fsp.readdir(uploadsPath);
    let cleanedCount = 0;
    let fileCount = 0;
    
    for (const item of items) {
      const itemPath = join(uploadsPath, item);
      const stats = await fsp.stat(itemPath);
      
      if (stats.isDirectory()) {
        // Check if this looks like a broken upload (directory with file extension)
        const hasFileExtension = item.includes('.') && /\.(jpe?g|png|mp4|pdf|txt|docx?|xlsx?)$/i.test(item);
        
        if (hasFileExtension) {
          console.log(`🔍 Found broken upload directory: ${item}`);
          
          try {
            // Check if there's an actual file inside this directory
            const dirContents = await fsp.readdir(itemPath);
            let actualFile = null;
            
            for (const subItem of dirContents) {
              const subPath = join(itemPath, subItem);
              const subStats = await fsp.stat(subPath);
              
              if (subStats.isFile() && subItem === item) {
                actualFile = subPath;
                break;
              }
            }
            
            if (actualFile) {
              console.log(`  📄 Found actual file inside: ${actualFile}`);
              
              // Move the file out of the directory to the parent
              const newPath = join(uploadsPath, item);
              const tempNewPath = newPath + '.temp';
              
              await fsp.rename(actualFile, tempNewPath);
              await fsp.rm(itemPath, { recursive: true, force: true });
              await fsp.rename(tempNewPath, newPath);
              
              console.log(`  ✅ Moved file to: ${newPath}`);
              fileCount++;
            } else {
              console.log(`  🗑️  No actual file found, removing directory`);
              await fsp.rm(itemPath, { recursive: true, force: true });
            }
            
            cleanedCount++;
          } catch (error) {
            console.log(`  ❌ Error processing ${item}: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`\n✅ Cleanup complete:`);
    console.log(`   📁 Directories cleaned: ${cleanedCount}`);
    console.log(`   📄 Files recovered: ${fileCount}`);
    
    // Show final structure
    console.log(`\n📋 Final structure:`);
    const finalItems = await fsp.readdir(uploadsPath);
    for (const item of finalItems.slice(0, 10)) { // Show first 10
      const itemPath = join(uploadsPath, item);
      const stats = await fsp.stat(itemPath);
      const type = stats.isDirectory() ? '📁' : '📄';
      const size = stats.isFile() ? ` (${stats.size} bytes)` : '';
      console.log(`   ${type} ${item}${size}`);
    }
    
    if (finalItems.length > 10) {
      console.log(`   ... and ${finalItems.length - 10} more items`);
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanupBrokenUploads();