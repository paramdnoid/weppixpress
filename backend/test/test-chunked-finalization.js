#!/usr/bin/env node
import { writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import chunkedUploadController from '../controllers/chunkedUploadController.js';

// Test chunked upload finalization specifically
async function testChunkedFinalization() {
  console.log('🧪 Testing chunked upload finalization...\n');

  // Create a test file
  const testContent = 'Hello, World! '.repeat(1000); // ~13KB file
  const testFilePath = join(tmpdir(), 'test-finalization.txt');
  writeFileSync(testFilePath, testContent);
  
  console.log(`📄 Created test file: ${testContent.length} bytes`);

  // Mock upload session data
  const chunkSize = 2048; // 2KB chunks
  const totalChunks = Math.ceil(testContent.length / chunkSize);
  const tempDir = join(tmpdir(), 'test-chunks-' + Date.now());
  const targetPath = join(tmpdir(), 'assembled-file.txt');
  
  try {
    // Create temp directory
    mkdirSync(tempDir, { recursive: true });
    console.log(`📁 Created temp directory: ${tempDir}`);

    // Split test file into chunks
    console.log(`✂️  Splitting into ${totalChunks} chunks...`);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, testContent.length);
      const chunkContent = testContent.slice(start, end);
      const chunkPath = join(tempDir, `chunk_${i}`);
      writeFileSync(chunkPath, chunkContent);
    }
    
    console.log('✅ Chunks created successfully');

    // Create mock upload session
    const uploadSession = {
      uploadId: 'test-upload-' + Date.now(),
      fileName: 'test-finalization.txt',
      fileSize: testContent.length,
      totalChunks,
      tempDir,
      targetPath,
      uploadedChunks: new Set(),
      status: 'uploading'
    };

    // Fill uploadedChunks
    for (let i = 0; i < totalChunks; i++) {
      uploadSession.uploadedChunks.add(i);
    }

    console.log('🔧 Mock upload session created');
    console.log(`   📊 Total chunks: ${totalChunks}`);
    console.log(`   📏 File size: ${testContent.length} bytes`);

    // Test finalization
    console.log('\n🚀 Starting finalization test...');
    
    await chunkedUploadController.finalizeUpload(uploadSession);
    
    console.log('✅ Finalization completed');

    // Verify the assembled file
    const assembledContent = readFileSync(targetPath, 'utf8');
    
    if (assembledContent === testContent) {
      console.log('✅ File assembly verification PASSED');
      console.log(`   📏 Original: ${testContent.length} bytes`);
      console.log(`   📏 Assembled: ${assembledContent.length} bytes`);
    } else {
      console.log('❌ File assembly verification FAILED');
      console.log(`   📏 Original: ${testContent.length} bytes`);
      console.log(`   📏 Assembled: ${assembledContent.length} bytes`);
      console.log(`   🔍 First difference at position: ${testContent.split('').findIndex((char, i) => char !== assembledContent[i])}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      unlinkSync(testFilePath);
      unlinkSync(targetPath);
      console.log('✅ Cleanup completed');
    } catch (cleanupError) {
      console.warn('⚠️  Cleanup warning:', cleanupError.message);
    }
  }
}

testChunkedFinalization().catch(console.error);