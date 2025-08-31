#!/usr/bin/env node
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import { promises as fsp } from 'fs';
import { join } from 'path';

// Debug getUniquePath behavior
async function debugUniquePath() {
  console.log('🔍 Debugging getUniquePath behavior...\n');

  const testDir = '/tmp/test-unique-path';
  
  try {
    // Ensure test directory exists and is clean
    await fsp.rm(testDir, { recursive: true, force: true });
    await fsp.mkdir(testDir, { recursive: true });

    // Test 1: Empty directory
    console.log('Test 1: Empty directory');
    const result1 = await chunkedUploadController.getUniquePath(testDir, 'test.jpg');
    console.log(`  Input dir: ${testDir}`);
    console.log(`  Input name: test.jpg`);
    console.log(`  Result: ${result1}`);
    console.log(`  Expected: ${join(testDir, 'test.jpg')}`);
    console.log(`  Match: ${result1 === join(testDir, 'test.jpg') ? 'YES' : 'NO'}\n`);

    // Create a file to test conflict resolution
    await fsp.writeFile(join(testDir, 'test.jpg'), 'dummy');

    // Test 2: File exists, should get unique name
    console.log('Test 2: File exists, should get unique name');
    const result2 = await chunkedUploadController.getUniquePath(testDir, 'test.jpg');
    console.log(`  Input dir: ${testDir}`);
    console.log(`  Input name: test.jpg`);
    console.log(`  Result: ${result2}`);
    console.log(`  Expected: ${join(testDir, 'test (1).jpg')}`);
    console.log(`  Match: ${result2 === join(testDir, 'test (1).jpg') ? 'YES' : 'NO'}\n`);

    // Check if the method creates any directories
    console.log('Test 3: Check if getUniquePath creates directories');
    const dirsBefore = await fsp.readdir(testDir);
    console.log(`  Directories before: ${dirsBefore.join(', ')}`);
    
    const result3 = await chunkedUploadController.getUniquePath(testDir, 'newfile.png');
    
    const dirsAfter = await fsp.readdir(testDir);
    console.log(`  Directories after: ${dirsAfter.join(', ')}`);
    console.log(`  New directories created: ${dirsAfter.length > dirsBefore.length ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    try {
      await fsp.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

debugUniquePath();