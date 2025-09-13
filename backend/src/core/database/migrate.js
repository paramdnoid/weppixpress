import pool from '../services/dbConnection.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import logger from '../../shared/utils/logger.js';

// database/migrate.js

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrations = [
  '001_create_users_table.sql',
  '002_create_files_table.sql',
  '003_add_user_roles.sql',
  '004_add_file_indexes.sql'
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
        logger.info(`Running migration: ${migration}`);
        
        const sqlContent = readFileSync(
          join(__dirname, 'migrations', migration), 
          'utf8'
        );
        
        // Remove comments and prepare SQL content
        const cleanedContent = sqlContent
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
        
        // Split by semicolons for files that have multiple statements
        const statements = cleanedContent
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
        
        // Execute each statement separately
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          logger.info(`  Executing statement ${i + 1}/${statements.length}...`);
          try {
            await pool.query(statement);
            logger.info(`  ✅ Statement executed successfully`);
          } catch (error) {
            logger.error(`  ❌ Statement failed: ${error.message}`);
            logger.error(`  SQL: ${statement.substring(0, 200)}...`);
            throw error;
          }
        }
        await pool.query(
          'INSERT INTO migrations (filename) VALUES (?)', 
          [migration]
        );
        
        logger.info(`✅ Migration ${migration} completed`);
      }
    }
    
    logger.info('🚀 All migrations completed');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

export default { runMigrations };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => process.exit(0));
}