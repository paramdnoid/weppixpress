// Shared types between frontend and backend

// User Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  has_2fa_enabled: boolean;
  profile_picture?: string;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface TwoFactorAuthResponse {
  requires2FA: boolean;
  userId?: string;
}

// File Types
export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  mime_type: string;
  extension: string;
  path: string;
  url: string;
  thumbnail_url?: string;
  owner_id: string;
  parent_id?: string;
  is_folder: boolean;
  is_shared: boolean;
  share_link?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  modified_at: Date;
  accessed_at?: Date;
}

export interface Folder extends Omit<FileItem, 'is_folder'> {
  is_folder: true;
  children_count: number;
}

// Upload Types
export interface UploadProgress {
  file_id: string;
  file_name: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  completed_at?: Date;
}

export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Email Types
export interface Email {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  html?: string;
  attachments?: Attachment[];
  folder: EmailFolder;
  is_read: boolean;
  is_starred: boolean;
  is_important: boolean;
  labels: string[];
  thread_id?: string;
  in_reply_to?: string;
  references?: string[];
  created_at: Date;
  sent_at?: Date;
  received_at?: Date;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  url: string;
  inline?: boolean;
  content_id?: string;
}

export enum EmailFolder {
  INBOX = 'inbox',
  SENT = 'sent',
  DRAFTS = 'drafts',
  SPAM = 'spam',
  TRASH = 'trash',
  ARCHIVE = 'archive'
}

// Share Types
export interface ShareLink {
  id: string;
  file_id: string;
  token: string;
  url: string;
  password?: string;
  expires_at?: Date;
  max_downloads?: number;
  download_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// API Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_more: boolean;
}

export interface SearchParams {
  query: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

// WebSocket Types
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: Date;
  id: string;
}

export enum WebSocketMessageType {
  // File events
  FILE_UPLOADED = 'file_uploaded',
  FILE_DELETED = 'file_deleted',
  FILE_MOVED = 'file_moved',
  FILE_RENAMED = 'file_renamed',
  FILE_SHARED = 'file_shared',
  
  // Upload events
  UPLOAD_PROGRESS = 'upload_progress',
  UPLOAD_COMPLETE = 'upload_complete',
  UPLOAD_FAILED = 'upload_failed',
  
  // Email events
  EMAIL_RECEIVED = 'email_received',
  EMAIL_SENT = 'email_sent',
  
  // System events
  USER_STATUS_CHANGED = 'user_status_changed',
  SYSTEM_NOTIFICATION = 'system_notification',
  CONNECTION_STATUS = 'connection_status'
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: Date;
  read_at?: Date;
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  FILE_SHARED = 'file_shared',
  EMAIL_RECEIVED = 'email_received',
  SYSTEM_UPDATE = 'system_update'
}

// Settings Types
export interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  storage: StorageSettings;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  file_activity: boolean;
  email_activity: boolean;
  system_updates: boolean;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'contacts';
  show_online_status: boolean;
  share_activity: boolean;
}

export interface StorageSettings {
  auto_delete_trash: boolean;
  trash_retention_days: number;
  compression_enabled: boolean;
  encryption_enabled: boolean;
}

// Activity Log Types
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: ResourceType;
  resource_id: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export enum ResourceType {
  FILE = 'file',
  FOLDER = 'folder',
  EMAIL = 'email',
  USER = 'user',
  SHARE = 'share',
  SETTINGS = 'settings'
}

// Session Types
export interface Session {
  id: string;
  user_id: string;
  token: string;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
  last_activity: Date;
  expires_at: Date;
  created_at: Date;
}

// Permission Types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Database Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit: number;
  waitForConnections: boolean;
  queueLimit: number;
}

// Redis Types
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

// Server Types
export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigin: string | string[];
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  uploadMaxSize: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
}

// Export all types
export * from './index';