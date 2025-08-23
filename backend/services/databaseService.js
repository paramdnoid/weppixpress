import pool from '../db.js';
import logger from '../utils/logger.js';

/**
 * Enhanced database service with connection pooling, transactions, and monitoring
 */
export class DatabaseService {
  constructor() {
    this.pool = pool;
    this.setupPoolEvents();
  }

  /**
   * Setup database pool event listeners for monitoring
   */
  setupPoolEvents() {
    this.pool.on('connection', (connection) => {
      logger.debug(`New database connection established: ${connection.threadId}`);
    });

    this.pool.on('enqueue', () => {
      logger.debug('Database connection request queued');
    });

    this.pool.on('error', (error) => {
      logger.error('Database pool error:', error);
    });
  }

  /**
   * Execute query with connection management
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise} Query result
   */
  async query(query, params = []) {
    const startTime = Date.now();
    let connection;
    
    try {
      connection = await this.pool.getConnection();
      const result = await connection.query(query, params);
      
      const duration = Date.now() - startTime;
      logger.debug('Query executed', {
        query: query.substring(0, 100),
        duration,
        rowsAffected: result.affectedRows || result.length || 0
      });
      
      return result;
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
   * @param {Function} callback - Function containing transaction logic
   * @returns {Promise} Transaction result
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
      await connection.rollback();
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
   * @param {Array} records - Array of record objects
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
        const values = batch.flatMap(record => columns.map(col => record[col]));
        
        let query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES `;
        query += batch.map(() => `(${placeholders})`).join(', ');
        
        if (onDuplicateKeyUpdate) {
          const updateClause = columns.map(col => `${col} = VALUES(${col})`).join(', ');
          query += ` ON DUPLICATE KEY UPDATE ${updateClause}`;
        }
        
        const result = await connection.query(query, values);
        results.push(result);
      });
    }

    return {
      affectedRows: results.reduce((sum, r) => sum + (r.affectedRows || 0), 0),
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
        totalConnections: this.pool.totalConnections(),
        activeConnections: this.pool.activeConnections(),
        idleConnections: this.pool.idleConnections(),
        taskQueueSize: this.pool.taskQueueSize()
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
      const [variables, status] = await Promise.all([
        this.query('SHOW GLOBAL VARIABLES LIKE "max_connections"'),
        this.query('SHOW GLOBAL STATUS LIKE "Threads_connected"')
      ]);
      
      return {
        maxConnections: variables[0]?.Value || 'unknown',
        currentConnections: status[0]?.Value || 'unknown',
        poolStats: {
          total: this.pool.totalConnections(),
          active: this.pool.activeConnections(),
          idle: this.pool.idleConnections(),
          queue: this.pool.taskQueueSize()
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