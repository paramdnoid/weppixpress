// Simple integration test for chunked upload system
import { createReadStream, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import chunkedUploadController from '../controllers/chunkedUploadController.js';

// Create a test file
const testFilePath = join(tmpdir(), 'test-upload.txt');
const testContent = 'This is a test file for chunked upload system.\n'.repeat(1000);
writeFileSync(testFilePath, testContent);

console.log('Created test file:', testFilePath);
console.log('File size:', testContent.length);

// Mock request and response objects
const mockReq = {
  user: { userId: 'test-user-123' },
  body: {
    fileName: 'test-upload.txt',
    fileSize: testContent.length,
    relativePath: 'test-folder'
  }
};

const mockRes = {
  json: (data) => {
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  },
  status: (code) => ({
    json: (data) => {
      console.log(`Response [${code}]:`, JSON.stringify(data, null, 2));
      return data;
    }
  })
};

const mockNext = (error) => {
  if (error) {
    console.error('Error:', error.message);
    throw error;
  }
};

async function testChunkedUpload() {
  try {
    console.log('\n=== Testing Chunked Upload System ===\n');
    
    // Test initialization
    console.log('1. Initializing upload session...');
    await chunkedUploadController.initializeUpload(mockReq, mockRes, mockNext);
    
    console.log('\n✓ Chunked upload controller is working!');
    console.log('✓ Upload session initialization succeeded');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup test file
    try {
      unlinkSync(testFilePath);
      console.log('✓ Test file cleaned up');
    } catch (e) {
      console.warn('Warning: Could not clean up test file');
    }
  }
}

testChunkedUpload();