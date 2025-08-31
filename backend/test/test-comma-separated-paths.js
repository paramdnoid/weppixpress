#!/usr/bin/env node
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import cacheService from '../services/cacheService.js';
import { promises as fsp } from 'fs';

// Test comma-separated path issue
async function testCommaSeparatedPaths() {
  console.log('🔍 Testing comma-separated path issue...\n');

  try {
    // Initialize cache service
    if (!cacheService.isAvailable()) {
      await cacheService.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clean up any previous test data
    try {
      await fsp.rm('/Users/andre/Projects/weppixpress/uploads/comma-test', { recursive: true, force: true });
    } catch (e) {
      // Ignore if doesn't exist
    }

    const mockUser = { userId: 'comma-test' };

    // Test the problematic case
    console.log('📁 Testing comma-separated relativePath: "FileManager,Mails,Meetings"');

    const testFile = {
      fileName: 'test-file.txt',
      content: 'Test content',
      relativePath: 'FileManager,Mails,Meetings'
    };

    console.log(`🔄 Processing ${testFile.fileName} with relativePath: "${testFile.relativePath}"`);

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
          console.log(`  ✅ Init successful`);
          console.log(`  📍 Target path: ${targetPath}`);
          console.log(`  📊 Total chunks: ${totalChunks}`);
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
            console.log(`  🎉 Upload completed`);
          }
        },
        status: (code) => ({
          json: (data) => {
            throw new Error(`Chunk failed: ${data.message}`);
          }
        })
      };

      await chunkedUploadController.uploadChunk(chunkReq, chunkRes, (error) => {
        if (error) throw error;
      });

      if (completed) break;
    }

    // Now examine the structure
    console.log('\n🔍 Actual directory structure created:');
    
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

    await walkDir('/Users/andre/Projects/weppixpress/uploads/comma-test');

    console.log('\n🤔 Expected structure should be:');
    console.log('📁 FileManager/');
    console.log('📁 Mails/');  
    console.log('📁 Meetings/');
    console.log('📄 test-file.txt (in one of them or root)');

  } catch (error) {
    console.error('\n❌ Comma test failed:', error.message);
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

testCommaSeparatedPaths();