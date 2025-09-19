// Database Types
export interface QueryResult<T = any> {
  rows: T[];
  fields?: any[];
  affectedRows?: number;
  insertId?: number;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  waitForConnections: boolean;
  queueLimit: number;
  connectTimeout: number;
  timezone: string;
  stringifyObjects: boolean;
  insecureAuth: boolean;
  supportBigNumbers: boolean;
  bigNumberStrings: boolean;
  dateStrings: boolean;
  debug: boolean;
  trace: boolean;
  multipleStatements: boolean;
}

export interface PoolConnection {
  query<T = any>(_sql: string, _values?: any[]): Promise<QueryResult<T>>;
  execute<T = any>(_sql: string, _values?: any[]): Promise<QueryResult<T>>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
  destroy(): void;
  ping(): Promise<void>;
}

export interface ConnectionPool {
  getConnection(): Promise<PoolConnection>;
  execute<T = any>(_sql: string, _values?: any[]): Promise<QueryResult<T>>;
  query<T = any>(_sql: string, _values?: any[]): Promise<QueryResult<T>>;
  end(): Promise<void>;
  on(_event: string, _listener: Function): void;
}

// Model Base Types
export interface BaseModel {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface SoftDeletableModel extends BaseModel {
  deleted_at?: Date | null;
}

// Query Builder Types
export interface FindOptions {
  where?: Record<string, any>;
  select?: string[];
  orderBy?: {
    field: string;
    direction: 'ASC' | 'DESC';
  }[];
  limit?: number;
  offset?: number;
  include?: string[];
}

export interface CreateOptions {
  returning?: boolean;
  transaction?: PoolConnection;
}

export interface UpdateOptions {
  where: Record<string, any>;
  returning?: boolean;
  transaction?: PoolConnection;
}

export interface DeleteOptions {
  where: Record<string, any>;
  soft?: boolean;
  transaction?: PoolConnection;
}

// Migration Types
export interface Migration {
  id: number;
  name: string;
  batch: number;
  executed_at: Date;
}

export interface MigrationFile {
  up(): Promise<void>;
  down(): Promise<void>;
}

// Transaction Types
export type TransactionCallback<T> = (_connection: PoolConnection) => Promise<T>;

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  retries?: number;
  retryDelay?: number;
}