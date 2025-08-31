#!/usr/bin/env node
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import cacheService from '../services/cacheService.js';

// Test complex folder upload structure with nested directories
async function testComplexFolderUpload() {
  console.log('🚀 Testing complex folder upload structure...\n');

  try {
    // Initialize cache service
    if (!cacheService.isAvailable()) {
      await cacheService.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Create test files with complex folder structure
    const files = [
      { name: 'readme.txt', content: 'Root readme', relativePath: '' },
      { name: 'config.json', content: '{"app":"test"}', relativePath: 'config' },
      { name: 'main.js', content: 'console.log("main")', relativePath: 'src' },
      { name: 'utils.js', content: 'console.log("utils")', relativePath: 'src/lib' },
      { name: 'test.js', content: 'console.log("test")', relativePath: 'src/tests' },
      { name: 'style.css', content: 'body { margin: 0; }', relativePath: 'public/css' },
      { name: 'image.jpg', content: 'fake-image-data', relativePath: 'public/images' }
    ];

    const mockUser = { userId: 'test-complex-folder-123' };

    console.log('📁 Testing complex folder structure:');
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
          chunkSize: '256' // Very small chunks to test multiple chunks
        }
      };

      let uploadId, totalChunks;
      const initRes = {
        json: (data) => {
          if (data.success) {
            uploadId = data.data.uploadId;
            totalChunks = data.data.totalChunks;
            console.log(`  ✅ Initialized: chunks: ${totalChunks}`);
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
        const start = chunkIdx * 256;
        const end = Math.min(start + 256, file.content.length);
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

    console.log('\n✅ All complex folder files uploaded successfully!');

  } catch (error) {
    console.error('\n❌ Complex folder upload test failed:', error.message);
    process.exit(1);
  } finally {
    try {
      await cacheService.close();
    } catch (e) {
      // Ignore
    }
  }
}

testComplexFolderUpload();