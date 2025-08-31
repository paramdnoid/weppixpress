#!/usr/bin/env node
import cacheService from '../services/cacheService.js';

async function debugRedisKeys() {
  console.log('🔍 Debugging Redis keys...\n');

  try {
    if (!cacheService.isAvailable()) {
      await cacheService.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check all upload session keys
    const uploadKeys = await cacheService.keys('upload_session:*');
    console.log(`📦 Found ${uploadKeys.length} upload session keys:`);
    
    for (const key of uploadKeys.slice(0, 10)) { // Show first 10
      const prefix = process.env.CACHE_PREFIX || 'weppix';
      const cacheKey = key.replace(`${prefix}:`, '');
      const ttl = await cacheService.ttl(cacheKey);
      const data = await cacheService.get(cacheKey);
      
      console.log(`   🔑 ${key}`);
      console.log(`      TTL: ${ttl}s`);
      console.log(`      Status: ${data?.status || 'unknown'}`);
      console.log(`      File: ${data?.fileName || 'unknown'}`);
      console.log(`      Chunks: ${data?.uploadedChunks?.length || 0}/${data?.totalChunks || 0}`);
      console.log('');
    }

    if (uploadKeys.length > 10) {
      console.log(`   ... and ${uploadKeys.length - 10} more keys`);
    }

    // Check cache stats
    const stats = cacheService.getStats();
    console.log('📊 Cache Statistics:');
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Hit Rate: ${stats.hitRate}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Connected: ${stats.isConnected}`);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    try {
      await cacheService.close();
    } catch (e) {
      // Ignore
    }
  }
}

debugRedisKeys();