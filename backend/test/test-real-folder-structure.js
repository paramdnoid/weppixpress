#!/usr/bin/env node
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import cacheService from '../services/cacheService.js';
import { promises as fsp } from 'fs';

// Test real folder upload with actual finalization
async function testRealFolderStructure() {
  console.log('🚀 Testing real folder structure creation...\n');

  try {
    // Initialize cache service
    if (!cacheService.isAvailable()) {
      await cacheService.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clean up any previous test data
    try {
      await fsp.rm('/Users/andre/Projects/weppixpress/uploads/real-folder-test', { recursive: true, force: true });
    } catch (e) {
      // Ignore if doesn't exist
    }

    const mockUser = { userId: 'real-folder-test' };

    // Test a simple scenario: 
    // - One file in root
    // - One file in subfolder
    const testFiles = [
      { fileName: 'readme.md', content: '# Test Project', relativePath: '' },
      { fileName: 'config.js', content: 'module.exports = {};', relativePath: 'config' }
    ];

    console.log('📁 Testing structure:');
    console.log('  📄 readme.md (root)');
    console.log('  📄 config/config.js');

    for (const testFile of testFiles) {
      console.log(`\n🔄 Processing ${testFile.fileName} in "${testFile.relativePath}"...`);

      // Step 1: Initialize upload
      const initReq = {
        user: mockUser,
        body: {
          fileName: testFile.fileName,
          fileSize: testFile.content.length.toString(),
          relativePath: testFile.relativePath,
          chunkSize: '512'
        }
      };

      let uploadId, totalChunks, targetPath;
      const initRes = {
        json: (data) => {
          if (data.success) {
            uploadId = data.data.uploadId;
            totalChunks = data.data.totalChunks;
            targetPath = data.data.targetPath;
            console.log(`  ✅ Init: chunks=${totalChunks}, target=${targetPath}`);
          } else {
            throw new Error('Init failed');
          }
        }
      };

      await chunkedUploadController.initializeUpload(initReq, initRes, (error) => {
        if (error) throw error;
      });

      // Step 2: Upload all chunks
      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const start = chunkIdx * 512;
        const end = Math.min(start + 512, testFile.content.length);
        const chunkContent = testFile.content.slice(start, end);

        const chunkReq = {
          user: mockUser,
          params: { uploadId },
          body: { chunkIndex: chunkIdx.toString() },
          file: { buffer: Buffer.from(chunkContent) }
        };

        let completed = false;
        const chunkRes = {
          json: (data) => {
            if (data.completed) {
              completed = true;
              console.log(`  🎉 Completed ${testFile.fileName}`);
            } else {
              console.log(`  📤 Chunk ${chunkIdx}/${totalChunks} (${data.progress.toFixed(1)}%)`);
            }
          },
          status: (code) => ({
            json: (data) => {
              throw new Error(`Chunk ${chunkIdx} failed: ${data.message}`);
            }
          })
        };

        await chunkedUploadController.uploadChunk(chunkReq, chunkRes, (error) => {
          if (error) throw error;
        });

        if (completed) break;
      }
    }

    // Now let's examine the final structure
    console.log('\n🔍 Final directory structure:');
    
    const walkDir = async (dir, prefix = '') => {
      try {
        const items = await fsp.readdir(dir);
        for (const item of items) {
          const fullPath = `${dir}/${item}`;
          const stats = await fsp.stat(fullPath);
          
          if (stats.isDirectory()) {
            console.log(`${prefix}📁 ${item}/`);
            await walkDir(fullPath, prefix + '  ');
          } else {
            console.log(`${prefix}📄 ${item} (${stats.size} bytes)`);
          }
        }
      } catch (error) {
        console.log(`${prefix}❌ Error reading ${dir}: ${error.message}`);
      }
    };

    await walkDir('/Users/andre/Projects/weppixpress/uploads/real-folder-test');

  } catch (error) {
    console.error('\n❌ Real folder test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    try {
      await cacheService.close();
    } catch (e) {
      // Ignore
    }
  }
}

testRealFolderStructure();