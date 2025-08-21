// database/migrate.js
import pool from '../db.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrations = [
  '001_create_users_table.sql',
  '002_create_files_table.sql'
];

export async function runMigrations() {
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get executed migrations
    const executed = await pool.query('SELECT filename FROM migrations');
    const executedFiles = executed.map(row => row.filename);

    // Run pending migrations
    for (const migration of migrations) {
      if (!executedFiles.includes(migration)) {
        console.log(`Running migration: ${migration}`);
        
        const sqlContent = readFileSync(
          join(__dirname, 'migrations', migration), 
          'utf8'
        );
        
        await pool.query(sqlContent);
        await pool.query(
          'INSERT INTO migrations (filename) VALUES (?)', 
          [migration]
        );
        
        console.log(`✅ Migration ${migration} completed`);
      }
    }
    
    console.log('🚀 All migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => process.exit(0));
}