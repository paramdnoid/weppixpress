import type { AxiosProgressEvent } from 'axios'

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
  timestamp: string
  requestId?: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  stack?: string
  field?: string
  validationErrors?: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code?: string
  value?: unknown
}

export interface PaginatedApiResponse<T> extends ApiResponse<{ items: T[]; pagination: PaginationInfo }> {
  data: {
    items: T[]
    pagination: PaginationInfo
  }
}

export interface PaginationInfo {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ApiRequestConfig {
  headers?: Record<string, string>
  params?: Record<string, unknown>
  timeout?: number
  signal?: AbortSignal
  onUploadProgress?: (progress: AxiosProgressEvent) => void
  onDownloadProgress?: (progress: AxiosProgressEvent) => void
}

export interface BatchOperationResult<T = unknown> {
  successful: T[]
  failed: Array<{
    item: T
    error: ApiError
  }>
  total: number
  successCount: number
  failureCount: number
}

// WebSocket types
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType
  payload: T
  timestamp: string
  id?: string
}

export enum WebSocketMessageType {
  CONNECTION_INIT = 'connection_init',
  CONNECTION_ACK = 'connection_ack',
  PING = 'ping',
  PONG = 'pong',
  MESSAGE = 'message',
  ERROR = 'error',
  COMPLETE = 'complete',
  FILE_UPLOAD_PROGRESS = 'file_upload_progress',
  FILE_OPERATION_UPDATE = 'file_operation_update',
  NOTIFICATION = 'notification'
}

export interface WebSocketState {
  connected: boolean
  reconnecting: boolean
  error: string | null
  reconnectAttempts: number
}

// Re-export types from api/index.ts for compatibility
export type {
  User,
  AuthTokens,
  UserSettings,
  Notification,
  FileItem,
  SearchFilters,
  Email,
  FilePermissions,
  UploadProgress,
  EmailPriority,
  UserRole,
  SearchQuery,
  WebSocketEvent
} from './api/index'
