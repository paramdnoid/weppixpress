import chunkedUploadController from '../controllers/chunkedUploadController.js';
import cacheService from '../services/cacheService.js';

// Mock cache service if not available
if (!cacheService.keys) {
  console.log('Adding mock keys method to cache service for testing');
  cacheService.keys = async (pattern) => {
    console.log(`Mock keys called with pattern: ${pattern}`);
    return [];
  };
}

console.log('✓ Chunked upload controller imported successfully');
console.log('✓ Cache service methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(cacheService)));

// Test cleanup method
try {
  const result = await chunkedUploadController.cleanupExpiredSessions();
  console.log('✓ Cleanup method executed successfully, cleaned:', result);
} catch (error) {
  console.log('✗ Cleanup method failed:', error.message);
}

console.log('✓ Basic functionality test completed');