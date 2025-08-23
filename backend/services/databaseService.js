import pool from '../db.js';
import logger from '../utils/logger.js';

/**
 * Enhanced database service with connection pooling, transactions, and monitoring
 */
class DatabaseService {
  constructor() {
    this.pool = pool;
    if (!this.pool) {
      throw new Error('Database pool is not initialized');
    }
    this.setupPoolEvents();
  }

  /**
   * Setup database pool event listeners for monitoring
   */
  setupPoolEvents() {
    if (!this.pool?.on) return;

    this.pool.on('connection', (connection) => {
      try {
        const id = connection.threadId || connection.processID || 'unknown';
        logger.debug(`New database connection established: ${id}`);
      } catch (_) {
        logger.debug('New database connection established');
      }
    });

    this.pool.on?.('enqueue', () => {
      logger.debug('Database connection request queued');
    });

    this.pool.on?.('error', (error) => {
      logger.error('Database pool error:', error);
    });
  }

  /**
   * Execute query with connection management
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<any>} Query result
   */
  async query(query, params = []) {
    const startTime = Date.now();
    let connection;

    try {
      connection = await this.pool.getConnection();

      // mysql2/promise returns [rows, fields]
      const [rows] = await connection.query(query, params);

      const duration = Date.now() - startTime;
      const rowsAffected = Array.isArray(rows)
        ? rows.length
        : (rows?.affectedRows ?? 0);

      logger.debug('Query executed', {
        query: query.substring(0, 100),
        duration,
        rowsAffected
      });

      return rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query failed', {
        query: query.substring(0, 100),
        error: error.message,
        duration,
        sqlState: error.sqlState,
        errno: error.errno
      });
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Function containing transaction logic (receives a connection)
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    const connection = await this.pool.getConnection();
    const startTime = Date.now();

    try {
      await connection.beginTransaction();
      logger.debug('Transaction started');

      const result = await callback(connection);

      await connection.commit();
      const duration = Date.now() - startTime;
      logger.debug('Transaction committed', { duration });

      return result;
    } catch (error) {
      try { await connection.rollback(); } catch (_) {}
      const duration = Date.now() - startTime;
      logger.error('Transaction rolled back', {
        error: error.message,
        duration
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Batch insert with transaction support
   * @param {string} tableName - Target table
   * @param {Array<object>} records - Array of record objects
   * @param {Object} options - Insert options
   */
  async batchInsert(tableName, records, options = {}) {
    if (!records || records.length === 0) {
      return { affectedRows: 0, insertId: null };
    }

    const { batchSize = 1000, onDuplicateKeyUpdate = false } = options;
    const results = [];

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      await this.transaction(async (connection) => {
        const columns = Object.keys(batch[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const values = batch.flatMap((record) => columns.map((col) => record[col]));

        let q = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES `;
        q += batch.map(() => `(${placeholders})`).join(', ');

        if (onDuplicateKeyUpdate) {
          const updateClause = columns.map((col) => `${col} = VALUES(${col})`).join(', ');
          q += ` ON DUPLICATE KEY UPDATE ${updateClause}`;
        }

        const [result] = await connection.query(q, values);
        results.push(result);
      });
    }

    return {
      affectedRows: results.reduce((sum, r) => sum + (r?.affectedRows || 0), 0),
      insertId: results[0]?.insertId || null
    };
  }

  /**
   * Check database health and connection status
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      const poolStatus = {
        totalConnections: this.pool.totalConnections?.() ?? 'n/a',
        activeConnections: this.pool.activeConnections?.() ?? 'n/a',
        idleConnections: this.pool.idleConnections?.() ?? 'n/a',
        taskQueueSize: this.pool.taskQueueSize?.() ?? 'n/a'
      };

      return {
        status: 'healthy',
        responseTime,
        pool: poolStatus
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const variables = await this.query('SHOW GLOBAL VARIABLES LIKE "max_connections"');
      const status = await this.query('SHOW GLOBAL STATUS LIKE "Threads_connected"');

      return {
        maxConnections: variables?.[0]?.Value || variables?.[0]?.Value || variables?.[0]?.Value || variables?.[0]?.value || 'unknown',
        currentConnections: status?.[0]?.Value || status?.[0]?.value || 'unknown',
        poolStats: {
          total: this.pool.totalConnections?.() ?? 'n/a',
          active: this.pool.activeConnections?.() ?? 'n/a',
          idle: this.pool.idleConnections?.() ?? 'n/a',
          queue: this.pool.taskQueueSize?.() ?? 'n/a'
        }
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Close database connections gracefully
   */
  async close() {
    try {
      await this.pool.end();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
    }
  }
}

// Export singleton instance
export default new DatabaseService();