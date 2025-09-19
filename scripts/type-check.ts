#!/usr/bin/env tsx
/**
 * Complete Type-Check Script for weppiXPRESS
 * Validates TypeScript across all project components
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

interface CheckResult {
  component: string;
  success: boolean;
  errors?: string;
  warnings?: string;
}

const PROJECT_ROOT = '/Users/andre/Projects/weppixpress';

// Colors for console output
const colors = {
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`
};

async function checkComponent(name: string, dir: string): Promise<CheckResult> {
  console.log(colors.blue(`\n📦 Checking ${name}...`));
  
  try {
    const { stdout, stderr } = await execAsync('npm run type-check', { cwd: dir });
    
    if (stderr && !stderr.includes('warning')) {
      return {
        component: name,
        success: false,
        errors: stderr
      };
    }
    
    console.log(colors.green(`✅ ${name}: No type errors found`));
    return {
      component: name,
      success: true,
      warnings: stderr
    };
  } catch (error: any) {
    return {
      component: name,
      success: false,
      errors: error.message || error.stdout || error.stderr
    };
  }
}

async function buildComponent(name: string, dir: string): Promise<CheckResult> {
  console.log(colors.blue(`\n🔨 Building ${name}...`));
  
  try {
    const { stdout, stderr } = await execAsync('npm run build', { cwd: dir });
    
    console.log(colors.green(`✅ ${name}: Build successful`));
    return {
      component: name,
      success: true,
      warnings: stderr
    };
  } catch (error: any) {
    return {
      component: name,
      success: false,
      errors: error.message || error.stdout || error.stderr
    };
  }
}

async function main() {
  console.log(colors.bold(colors.blue('\n🚀 weppiXPRESS Complete Type Check\n')));
  
  const results: CheckResult[] = [];
  
  // Check backend
  const backendResult = await checkComponent('Backend', path.join(PROJECT_ROOT, 'backend'));
  results.push(backendResult);
  
  // Build backend if type check passes
  if (backendResult.success) {
    const buildResult = await buildComponent('Backend Build', path.join(PROJECT_ROOT, 'backend'));
    results.push(buildResult);
  }
  
  // Check frontend
  const frontendResult = await checkComponent('Frontend', path.join(PROJECT_ROOT, 'frontend'));
  results.push(frontendResult);
  
  // Generate report
  console.log(colors.blue('\n📊 Type Check Report:'));
  console.log(colors.gray('─'.repeat(50)));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(colors.green(`✅ Successful: ${successful}`));
  console.log(colors.red(`❌ Failed: ${failed}`));
  console.log(colors.gray('─'.repeat(50)));
  
  if (failed > 0) {
    console.log(colors.red('\n❌ Components with errors:'));
    results.filter(r => !r.success).forEach(r => {
      console.log(colors.red(`  - ${r.component}`));
      if (r.errors) {
        // Show first few lines of error
        const errorLines = r.errors.split('\n').slice(0, 5).join('\n');
        console.log(colors.gray(errorLines));
      }
    });
    
    console.log(colors.yellow('\n💡 To fix errors, try:'));
    console.log(colors.gray('  1. cd backend && npm run build'));
    console.log(colors.gray('  2. cd frontend && npm run type-check'));
    console.log(colors.gray('  3. Fix reported TypeScript errors'));
  } else {
    console.log(colors.green('\n✅ All type checks passed successfully!'));
  }
}

// Run the script
main().catch(error => {
  console.error(colors.red('\n❌ Script failed:'), error);
  process.exit(1);
});