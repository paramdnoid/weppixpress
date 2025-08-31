#!/usr/bin/env node
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import cacheService from '../services/cacheService.js';

// Test complete chunked upload flow
async function testFullUploadFlow() {
  console.log('🚀 Testing complete chunked upload flow...\n');

  let testFilePath;

  try {
    // Initialize cache service
    if (!cacheService.isAvailable()) {
      await cacheService.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Create test file
    const testContent = 'Hello, World! '.repeat(500); // ~6.5KB file
    testFilePath = join(tmpdir(), 'test-upload-flow.txt');
    writeFileSync(testFilePath, testContent);
    
    console.log(`📄 Created test file: ${testContent.length} bytes`);

    const mockUser = { userId: 'test-user-flow-123' };
    const mockFile = {
      buffer: Buffer.from(testContent.slice(0, 1024)) // First chunk
    };

    // Step 1: Initialize upload
    console.log('\n1️⃣  Initializing upload...');
    const initReq = {
      user: mockUser,
      body: {
        fileName: 'test-upload-flow.txt',
        fileSize: testContent.length.toString(),
        relativePath: '',
        chunkSize: '1024' // 1KB chunks
      }
    };

    let uploadId, totalChunks;

    const initRes = {
      json: (data) => {
        if (data.success) {
          uploadId = data.data.uploadId;
          totalChunks = data.data.totalChunks;
          console.log(`✅ Upload initialized: ${uploadId}`);
          console.log(`   📊 Total chunks: ${totalChunks}`);
        } else {
          throw new Error('Init failed: ' + JSON.stringify(data));
        }
      }
    };

    await chunkedUploadController.initializeUpload(initReq, initRes, (error) => {
      if (error) throw error;
    });

    // Step 2: Upload first chunk immediately (simulating real scenario)
    console.log('\n2️⃣  Uploading first chunk...');
    
    const chunkReq = {
      user: mockUser,
      params: { uploadId },
      body: { chunkIndex: '0' },
      file: mockFile
    };

    const chunkRes = {
      json: (data) => {
        console.log(`   📤 Chunk 0 response:`, data);
        if (!data.success) {
          throw new Error('Chunk upload failed: ' + data.message);
        }
      },
      status: (code) => ({
        json: (data) => {
          console.log(`   📤 Chunk 0 response [${code}]:`, data);
          throw new Error('Chunk upload failed with status ' + code);
        }
      })
    };

    await chunkedUploadController.uploadChunk(chunkReq, chunkRes, (error) => {
      if (error) throw error;
    });

    // Step 3: Upload remaining chunks
    console.log('\n3️⃣  Uploading remaining chunks...');
    
    for (let i = 1; i < totalChunks; i++) {
      const start = i * 1024;
      const end = Math.min(start + 1024, testContent.length);
      const chunkContent = testContent.slice(start, end);
      
      const chunkReq2 = {
        user: mockUser,
        params: { uploadId },
        body: { chunkIndex: i.toString() },
        file: { buffer: Buffer.from(chunkContent) }
      };

      let chunkCompleted = false;
      const chunkRes2 = {
        json: (data) => {
          console.log(`   📤 Chunk ${i} response:`, data);
          if (data.completed) {
            chunkCompleted = true;
            console.log('🎉 Upload completed!');
          }
        },
        status: (code) => ({
          json: (data) => {
            console.log(`   📤 Chunk ${i} response [${code}]:`, data);
            throw new Error('Chunk upload failed with status ' + code);
          }
        })
      };

      await chunkedUploadController.uploadChunk(chunkReq2, chunkRes2, (error) => {
        if (error) throw error;
      });

      if (chunkCompleted) break;
    }

    console.log('\n✅ Full upload flow test completed successfully!');

  } catch (error) {
    console.error('\n❌ Full upload flow test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (testFilePath) {
      try {
        unlinkSync(testFilePath);
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

testFullUploadFlow();