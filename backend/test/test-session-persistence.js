#!/usr/bin/env node
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import cacheService from '../services/cacheService.js';
import logger from '../utils/logger.js';

// Test session persistence
async function testSessionPersistence() {
  console.log('🧪 Testing upload session persistence...\n');

  try {
    // Initialize cache service
    if (!cacheService.isAvailable()) {
      console.log('📦 Initializing cache service...');
      await cacheService.initialize();
      // Give it a moment to connect
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!cacheService.isAvailable()) {
      throw new Error('Cache service is not available');
    }

    console.log('✅ Cache service is available');

    // Create a mock upload session
    const uploadId = 'test-session-' + Date.now();
    const userId = 'test-user-123';
    
    const mockSession = {
      uploadId,
      userId,
      fileName: 'test-file.txt',
      fileSize: 10000,
      chunkSize: 2048,
      targetPath: '/tmp/test-file.txt',
      tempDir: '/tmp/test-chunks',
      relativePath: '',
      totalChunks: 5,
      uploadedChunks: new Set([0, 1]),
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'uploading'
    };

    console.log(`📝 Saving test session: ${uploadId}`);
    
    // Test saving session
    const saveResult = await chunkedUploadController.saveUploadSession(uploadId, mockSession);
    console.log(`💾 Save result: ${saveResult}`);

    // Test retrieving session
    console.log(`🔍 Retrieving session: ${uploadId}`);
    const retrievedSession = await chunkedUploadController.getUploadSession(uploadId);

    if (retrievedSession) {
      console.log('✅ Session retrieved successfully');
      console.log(`   📄 File: ${retrievedSession.fileName}`);
      console.log(`   📊 Chunks: ${retrievedSession.uploadedChunks.size}/${retrievedSession.totalChunks}`);
      console.log(`   📈 Status: ${retrievedSession.status}`);
      
      // Verify data integrity
      if (retrievedSession.fileName === mockSession.fileName && 
          retrievedSession.uploadedChunks.size === 2 &&
          retrievedSession.totalChunks === 5) {
        console.log('✅ Data integrity check passed');
      } else {
        console.log('❌ Data integrity check failed');
      }
    } else {
      console.log('❌ Session not found after saving');
    }

    // Test session key listing
    console.log(`\n🔑 Testing key pattern search...`);
    const keys = await cacheService.keys(`upload_session:*:${uploadId}`);
    console.log(`   Keys found: ${keys.length}`);
    if (keys.length > 0) {
      console.log(`   First key: ${keys[0]}`);
    }

    // Test TTL
    if (keys.length > 0) {
      const prefix = process.env.CACHE_PREFIX || 'weppix';
      const cacheKey = keys[0].replace(`${prefix}:`, '');
      const ttl = await cacheService.ttl(cacheKey);
      console.log(`   TTL: ${ttl} seconds (${Math.round(ttl / 3600)} hours)`);
    }

    // Cleanup
    console.log(`\n🧹 Cleaning up test session...`);
    const deletedCount = await chunkedUploadController.deleteUploadSession(uploadId);
    console.log(`   Deleted: ${deletedCount} keys`);

    console.log('\n✅ Session persistence test completed successfully!');

  } catch (error) {
    console.error('\n❌ Session persistence test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    try {
      await cacheService.close();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testSessionPersistence();