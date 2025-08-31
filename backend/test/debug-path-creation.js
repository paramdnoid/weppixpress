#!/usr/bin/env node
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import cacheService from '../services/cacheService.js';

// Test path creation logic
async function debugPathCreation() {
  console.log('🔍 Debugging path creation logic...\n');

  try {
    // Initialize cache service
    if (!cacheService.isAvailable()) {
      await cacheService.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const mockUser = { userId: 'debug-path-123' };

    // Test different scenarios
    const testCases = [
      { fileName: 'root-file.txt', relativePath: '', expected: '/root-file.txt' },
      { fileName: 'config.json', relativePath: 'config', expected: '/config/config.json' },
      { fileName: 'main.js', relativePath: 'src', expected: '/src/main.js' },
      { fileName: 'style.css', relativePath: 'assets/css', expected: '/assets/css/style.css' }
    ];

    for (const testCase of testCases) {
      console.log(`📋 Testing: "${testCase.fileName}" with relativePath: "${testCase.relativePath}"`);

      const initReq = {
        user: mockUser,
        body: {
          fileName: testCase.fileName,
          fileSize: '100',
          relativePath: testCase.relativePath,
          chunkSize: '1024'
        }
      };

      let actualTargetPath;
      const initRes = {
        json: (data) => {
          if (data.success) {
            actualTargetPath = data.data.targetPath;
            console.log(`  ✅ Expected: ${testCase.expected}`);
            console.log(`  📍 Actual:   ${actualTargetPath}`);
            console.log(`  🟢 Match: ${actualTargetPath === testCase.expected ? 'YES' : 'NO'}\n`);
          } else {
            throw new Error('Init failed: ' + JSON.stringify(data));
          }
        }
      };

      await chunkedUploadController.initializeUpload(initReq, initRes, (error) => {
        if (error) throw error;
      });
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  } finally {
    try {
      await cacheService.close();
    } catch (e) {
      // Ignore
    }
  }
}

debugPathCreation();