// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User & Auth Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  is2FAEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// File System Types
export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size: number;
  sizeFormatted: string;
  extension?: string;
  mimeType?: string;
  created: string;
  modified: string;
  accessed: string;
  hasSubfolders?: boolean;
  itemCount?: number;
  hasThumbnail?: boolean;
  thumbnailId?: string;
  permissions?: FilePermissions;
  children?: FileItem[];
}

export interface FilePermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
  share: boolean;
}

export interface FileOperation {
  type: 'upload' | 'download' | 'delete' | 'move' | 'copy' | 'rename' | 'create' | 'batch';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  files: string[];
  timestamp: number;
}

export type SelectionMode = 'single' | 'multiple' | 'none' | 'range' | 'toggle';

export type SortDirection = 'asc' | 'desc';

// UI State Types
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

export interface ModalState {
  isOpen: boolean;
  component: string | null;
  props?: Record<string, any>;
}