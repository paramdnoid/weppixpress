// Service Types
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flush(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
}

export interface EmailService {
  send(options: EmailOptions): Promise<EmailResult>;
  sendBulk(emails: EmailOptions[]): Promise<EmailResult[]>;
  sendTemplate(templateName: string, data: any, to: string | string[]): Promise<EmailResult>;
  verifyConnection(): Promise<boolean>;
}

export interface EmailOptions {
  to: string | string[];
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  encoding?: string;
  cid?: string;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
  response?: string;
}

export interface QueueService<T = any> {
  add(job: T, options?: QueueOptions): Promise<string>;
  process(handler: QueueHandler<T>): void;
  remove(jobId: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  getJob(jobId: string): Promise<QueueJob<T> | null>;
  getJobs(status?: QueueJobStatus): Promise<QueueJob<T>[]>;
  clean(grace: number, status?: QueueJobStatus): Promise<void>;
}

export interface QueueOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: number | { type: 'fixed' | 'exponential'; delay: number };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export type QueueHandler<T> = (job: QueueJob<T>) => Promise<void>;

export interface QueueJob<T = any> {
  id: string;
  data: T;
  progress: number;
  attempts: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export type QueueJobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface SearchService {
  index(document: SearchDocument): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
  update(id: string, document: Partial<SearchDocument>): Promise<void>;
  bulk(operations: SearchBulkOperation[]): Promise<void>;
}

export interface SearchDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  fields?: string[];
  highlight?: boolean;
  fuzzy?: boolean;
  filters?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  document: SearchDocument;
  highlights?: Record<string, string[]>;
}

export interface SearchBulkOperation {
  type: 'index' | 'update' | 'delete';
  id?: string;
  document?: SearchDocument | Partial<SearchDocument>;
}

export interface MetricsService {
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  timing(metric: string, value: number, tags?: Record<string, string>): void;
}

export interface LoggerService {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  fatal(message: string, meta?: any): void;
  child(meta: any): LoggerService;
}