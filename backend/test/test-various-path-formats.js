#!/usr/bin/env node
import { sanitizeUploadPath } from '../utils/pathSecurity.js';

// Test various path formats
function testVariousPathFormats() {
  console.log('🔍 Testing various path format handling...\n');

  const testCases = [
    { input: 'FileManager,Mails,Meetings', expected: 'FileManager/Mails/Meetings' },
    { input: 'Documents,Projects,2024', expected: 'Documents/Projects/2024' },
    { input: 'src/components', expected: 'src/components' }, // Normal path should not be affected
    { input: 'folder with spaces, another folder', expected: 'folder with spaces/another folder' },
    { input: 'single', expected: 'single' },
    { input: '', expected: '' },
    { input: 'a,b,c,d,e', expected: 'a/b/c/d/e' },
    { input: 'folder/with/slash,comma,separated', expected: 'folder/with/slash,comma,separated' }, // Mixed - should keep as is
  ];

  for (const testCase of testCases) {
    const result = sanitizeUploadPath(testCase.input);
    const isCorrect = result === testCase.expected;
    
    console.log(`Input:    "${testCase.input}"`);
    console.log(`Expected: "${testCase.expected}"`);
    console.log(`Result:   "${result}"`);
    console.log(`✅ ${isCorrect ? 'PASS' : 'FAIL'}\n`);
  }
}

testVariousPathFormats();