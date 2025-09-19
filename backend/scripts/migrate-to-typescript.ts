#!/usr/bin/env tsx
/**
 * TypeScript Migration Script
 * Automatically migrates JavaScript files to TypeScript
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

interface MigrationConfig {
  baseDir: string;
  excludeDirs: string[];
  excludeFiles: string[];
  dryRun: boolean;
}

const config: MigrationConfig = {
  baseDir: '/Users/andre/Projects/weppixpress/backend',
  excludeDirs: ['node_modules', 'dist', 'logs', 'uploads', 'tests', '.git'],
  excludeFiles: ['ecosystem.config.js', 'eslint.config.js'],
  dryRun: false // Set to true to preview changes without making them
};

// Type imports to add to files
const commonImports = `import type { Request, Response, NextFunction } from 'express';\n`;

// Map of common patterns to replace
const replacementPatterns: Array<{ pattern: RegExp; replacement: string }> = [
  // Convert function parameters with type annotations
  { pattern: /function\s+(\w+)\s*\(req,\s*res,\s*next\)/g, replacement: 'function $1(req: Request, res: Response, next: NextFunction)' },
  { pattern: /function\s+(\w+)\s*\(req,\s*res\)/g, replacement: 'function $1(req: Request, res: Response)' },
  { pattern: /async\s+function\s+(\w+)\s*\(req,\s*res,\s*next\)/g, replacement: 'async function $1(req: Request, res: Response, next: NextFunction)' },
  { pattern: /async\s+function\s+(\w+)\s*\(req,\s*res\)/g, replacement: 'async function $1(req: Request, res: Response)' },
  
  // Convert arrow functions
  { pattern: /const\s+(\w+)\s*=\s*\(req,\s*res,\s*next\)\s*=>/g, replacement: 'const $1 = (req: Request, res: Response, next: NextFunction) =>' },
  { pattern: /const\s+(\w+)\s*=\s*\(req,\s*res\)\s*=>/g, replacement: 'const $1 = (req: Request, res: Response) =>' },
  { pattern: /const\s+(\w+)\s*=\s*async\s*\(req,\s*res,\s*next\)\s*=>/g, replacement: 'const $1 = async (req: Request, res: Response, next: NextFunction) =>' },
  { pattern: /const\s+(\w+)\s*=\s*async\s*\(req,\s*res\)\s*=>/g, replacement: 'const $1 = async (req: Request, res: Response) =>' },
  
  // Convert exports
  { pattern: /module\.exports\s*=\s*{/g, replacement: 'export {' },
  { pattern: /module\.exports\s*=\s*/g, replacement: 'export default ' },
  { pattern: /exports\.(\w+)\s*=/g, replacement: 'export const $1 =' },
  
  // Convert requires to imports (basic cases)
  { pattern: /const\s+(\w+)\s*=\s*require\(['"](.+)['"]\);?/g, replacement: "import $1 from '$2';" },
  { pattern: /const\s+{\s*([^}]+)\s*}\s*=\s*require\(['"](.+)['"]\);?/g, replacement: "import { $1 } from '$2';" },
];

async function getAllJsFiles(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip excluded directories
    if (entry.isDirectory() && config.excludeDirs.includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      await getAllJsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      // Skip excluded files
      if (!config.excludeFiles.includes(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function addTypeAnnotations(content: string, filePath: string): string {
  let result = content;
  
  // Apply replacement patterns
  for (const { pattern, replacement } of replacementPatterns) {
    result = result.replace(pattern, replacement);
  }
  
  // Add common imports if the file contains Express routes
  if (result.includes('req: Request') || result.includes('res: Response')) {
    if (!result.includes("from 'express'")) {
      result = commonImports + result;
    }
  }
  
  // Fix import paths to remove .js extensions
  result = result.replace(/from\s+['"](.+)\.js['"]/g, "from '$1'");
  
  return result;
}

async function migrateFile(filePath: string): Promise<void> {
  try {
    // Read the JavaScript file
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Add type annotations
    const typedContent = addTypeAnnotations(content, filePath);
    
    // Calculate new file path (.js -> .ts)
    const newFilePath = filePath.replace(/\.js$/, '.ts');
    
    if (config.dryRun) {
      console.log(`Would migrate: ${filePath} -> ${newFilePath}`);
    } else {
      // Write the TypeScript file
      await fs.writeFile(newFilePath, typedContent);
      
      // Delete the original JavaScript file
      await fs.unlink(filePath);
      
      console.log(`✅ Migrated: ${path.relative(config.baseDir, filePath)} -> ${path.basename(newFilePath)}`);
    }
  } catch (error) {
    console.error(`❌ Failed to migrate ${filePath}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting TypeScript Migration...');
  console.log(`Base directory: ${config.baseDir}`);
  console.log(`Dry run: ${config.dryRun}`);
  
  // Find all JavaScript files
  const jsFiles = await getAllJsFiles(config.baseDir);
  console.log(`Found ${jsFiles.length} JavaScript files to migrate\n`);
  
  if (jsFiles.length === 0) {
    console.log('No JavaScript files found to migrate!');
    return;
  }
  
  // Migrate each file
  for (const file of jsFiles) {
    await migrateFile(file);
  }
  
  console.log('\n✨ Migration complete!');
  
  if (config.dryRun) {
    console.log('\nThis was a dry run. Set dryRun to false to perform the actual migration.');
  } else {
    console.log('\nNext steps:');
    console.log('1. Run: npm run build');
    console.log('2. Fix any TypeScript compilation errors');
    console.log('3. Run: npm test');
    console.log('4. Update your deployment scripts to use the compiled JavaScript');
  }
}

// Run the migration
main().catch(console.error);