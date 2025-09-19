// Configuration Types
export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  storage: StorageConfig;
  email: EmailConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
  apiPrefix: string;
  corsOrigin: string | string[];
  trustProxy: boolean;
  requestTimeout: number;
  keepAliveTimeout: number;
  maxRequestSize: string;
}

export interface DatabaseConfig {
  type: 'mysql' | 'postgres' | 'mariadb';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit: number;
  waitForConnections: boolean;
  queueLimit: number;
  connectTimeout: number;
  timezone: string;
  ssl?: {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttl: number;
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  connectTimeout: number;
}

export interface AuthConfig {
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
    audience: string;
  };
  bcrypt: {
    saltRounds: number;
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  twoFactor: {
    issuer: string;
    window: number;
  };
  passwordReset: {
    tokenExpiry: number;
    maxAttempts: number;
  };
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs' | 'azure';
  local?: {
    uploadDir: string;
    publicDir: string;
    tempDir: string;
    maxFileSize: number;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  };
  gcs?: {
    bucket: string;
    projectId: string;
    keyFilename: string;
  };
  azure?: {
    containerName: string;
    accountName: string;
    accountKey: string;
  };
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  from: {
    name: string;
    email: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  mailgun?: {
    apiKey: string;
    domain: string;
  };
}

export interface SecurityConfig {
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
    skipSuccessfulRequests: boolean;
  };
  helmet: {
    contentSecurityPolicy: boolean | Record<string, any>;
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
  };
  cors: {
    credentials: boolean;
    maxAge: number;
    allowedHeaders: string[];
    exposedHeaders: string[];
  };
  csrf: {
    enabled: boolean;
    secret: string;
  };
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'simple' | 'detailed';
  transports: LogTransport[];
  errorFile: string;
  combinedFile: string;
  maxSize: string;
  maxFiles: string;
  colorize: boolean;
}

export interface LogTransport {
  type: 'console' | 'file' | 'syslog' | 'http';
  level?: string;
  filename?: string;
  host?: string;
  port?: number;
  path?: string;
}