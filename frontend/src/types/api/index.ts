// Base API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
  timestamp: string;
}

export interface ResponseMeta {
  pagination?: Pagination;
  timestamp: string;
  requestId: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// User & Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
  GUEST = 'guest'
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// File Management Types
export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  thumbnailUrl?: string;
  downloadUrl: string;
  shareUrl?: string;
  isPublic: boolean;
  tags: string[];
  metadata: FileMetadata;
  permissions: FilePermissions;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  checksum: string;
  encoding?: string;
  lastModified: string;
  customFields?: Record<string, unknown>;
}

export interface FilePermissions {
  owner: string;
  canRead: string[];
  canWrite: string[];
  canDelete: string[];
  canShare: string[];
}

export interface UploadRequest {
  file: File;
  folder?: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  remainingTime: number;
}

// Email Management Types
export interface Email {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  folder: string;
  labels: string[];
  priority: EmailPriority;
  sentAt?: string;
  receivedAt: string;
  threadId?: string;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  contentId?: string;
  downloadUrl: string;
}

export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachmentIds?: string[];
  priority?: EmailPriority;
  scheduledAt?: string;
}

// WebSocket Event Types
export interface WebSocketMessage<T = unknown> {
  event: WebSocketEvent;
  data: T;
  timestamp: string;
  correlationId?: string;
}

export enum WebSocketEvent {
  FILE_UPLOADED = 'file.uploaded',
  FILE_DELETED = 'file.deleted',
  FILE_UPDATED = 'file.updated',
  EMAIL_RECEIVED = 'email.received',
  EMAIL_SENT = 'email.sent',
  USER_JOINED = 'user.joined',
  USER_LEFT = 'user.left',
  NOTIFICATION = 'notification',
  ERROR = 'error'
}

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SYSTEM = 'system'
}

// Search & Filter Types
export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SortOptions;
  pagination?: PaginationRequest;
}

export interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  fileTypes?: string[];
  tags?: string[];
  users?: string[];
  folders?: string[];
  minSize?: number;
  maxSize?: number;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationRequest {
  page: number;
  limit: number;
}

// Settings Types
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  storage: StorageSettings;
}

export interface NotificationSettings {
  email: boolean;
  desktop: boolean;
  mobile: boolean;
  sound: boolean;
  types: Record<NotificationType, boolean>;
}

export interface PrivacySettings {
  profileVisible: boolean;
  showEmail: boolean;
  allowDirectMessages: boolean;
  shareActivityStatus: boolean;
}

export interface StorageSettings {
  autoCleanup: boolean;
  cleanupDays: number;
  maxUploadSize: number;
  allowedFileTypes: string[];
}

// Flow/Workflow Types
export interface Flow {
  id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  triggers: FlowTrigger[];
  isActive: boolean;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlowStep {
  id: string;
  type: FlowStepType;
  config: Record<string, unknown>;
  conditions?: FlowCondition[];
  nextSteps: string[];
}

export enum FlowStepType {
  FILE_PROCESS = 'file_process',
  EMAIL_SEND = 'email_send',
  NOTIFICATION = 'notification',
  CONDITION = 'condition',
  TRANSFORM = 'transform',
  WEBHOOK = 'webhook'
}

export interface FlowTrigger {
  type: FlowTriggerType;
  config: Record<string, unknown>;
}

export enum FlowTriggerType {
  FILE_UPLOAD = 'file_upload',
  EMAIL_RECEIVE = 'email_receive',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  MANUAL = 'manual'
}

export interface FlowCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex';
  value: unknown;
  logicalOperator?: 'and' | 'or';
}

// Activity & Audit Types
export interface Activity {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface AuditLog extends Activity {
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  riskLevel: 'low' | 'medium' | 'high';
}

// Dashboard & Analytics Types
export interface DashboardStats {
  totalFiles: number;
  totalSize: number;
  totalEmails: number;
  activeUsers: number;
  recentActivity: Activity[];
  storageUsage: StorageUsage;
  emailStats: EmailStats;
}

export interface StorageUsage {
  used: number;
  total: number;
  percentage: number;
  breakdown: {
    documents: number;
    images: number;
    videos: number;
    other: number;
  };
}

export interface EmailStats {
  sent: number;
  received: number;
  draft: number;
  unread: number;
  averageResponseTime: number;
}

// Request Interceptor Types
export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  credentials?: 'include' | 'omit' | 'same-origin';
}

// Error Handling Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface BatchOperationResult<T = unknown> {
  successful: T[];
  failed: {
    item: T;
    error: ApiError;
  }[];
  stats: {
    total: number;
    succeeded: number;
    failed: number;
  };
}