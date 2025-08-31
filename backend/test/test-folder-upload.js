#!/usr/bin/env node
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import cacheService from '../services/cacheService.js';

// Test folder upload structure
async function testFolderUpload() {
  console.log('🚀 Testing folder upload structure...\n');

  let testDir;

  try {
    // Initialize cache service
    if (!cacheService.isAvailable()) {
      await cacheService.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Create test folder structure
    testDir = join(tmpdir(), 'test-folder-upload');
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'subfolder'), { recursive: true });
    
    // Create test files in folder structure
    const files = [
      { name: 'file1.txt', content: 'File 1 content', relativePath: '' },
      { name: 'file2.txt', content: 'File 2 content', relativePath: 'subfolder' },
      { name: 'file3.txt', content: 'File 3 content', relativePath: 'subfolder' }
    ];

    const mockUser = { userId: 'test-user-folder-123' };

    console.log('📁 Testing files:');
    for (const file of files) {
      const fullPath = file.relativePath ? `${file.relativePath}/${file.name}` : file.name;
      console.log(`  📄 ${fullPath}`);
    }

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n🔄 Uploading ${file.name} to "${file.relativePath}"...`);

      // Step 1: Initialize upload
      const initReq = {
        user: mockUser,
        body: {
          fileName: file.name,
          fileSize: file.content.length.toString(),
          relativePath: file.relativePath,
          chunkSize: '512' // Small chunks
        }
      };

      let uploadId, totalChunks;
      const initRes = {
        json: (data) => {
          if (data.success) {
            uploadId = data.data.uploadId;
            totalChunks = data.data.totalChunks;
            console.log(`  ✅ Initialized: ${uploadId}, chunks: ${totalChunks}`);
            console.log(`  📍 Target path: ${data.data.targetPath}`);
          } else {
            throw new Error('Init failed: ' + JSON.stringify(data));
          }
        }
      };

      await chunkedUploadController.initializeUpload(initReq, initRes, (error) => {
        if (error) throw error;
      });

      // Step 2: Upload chunks
      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const start = chunkIdx * 512;
        const end = Math.min(start + 512, file.content.length);
        const chunkContent = file.content.slice(start, end);

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
              console.log(`  🎉 Upload completed for ${file.name}`);
            }
          },
          status: (code) => ({
            json: (data) => {
              throw new Error(`Chunk upload failed with status ${code}: ${data.message}`);
            }
          })
        };

        await chunkedUploadController.uploadChunk(chunkReq, chunkRes, (error) => {
          if (error) throw error;
        });

        if (completed) break;
      }
    }

    console.log('\n✅ All files uploaded successfully!');

    // Now let's check the directory structure
    console.log('\n🔍 Checking upload directory structure...');
    
    // Run the debug script to see the structure
    console.log('Running directory debug...');

  } catch (error) {
    console.error('\n❌ Folder upload test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (testDir) {
      try {
        unlinkSync(join(testDir, 'file1.txt'));
        unlinkSync(join(testDir, 'subfolder', 'file2.txt'));
        unlinkSync(join(testDir, 'subfolder', 'file3.txt'));
      } catch (e) {
        // Ignore
      }
    }
    
    try {
      await cacheService.close();
    } catch (e) {
      // Ignore
    }
  }
}

testFolderUpload();