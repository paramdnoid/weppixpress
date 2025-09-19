import type { User, AuthTokens, UserSettings, Notification } from './api';

// Store State Types
export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number;
  sessionExpiry: number | null;
}

export interface UserState {
  currentUser: User | null;
  users: Map<string, User>;
  onlineUsers: Set<string>;
  settings: UserSettings | null;
  isLoadingSettings: boolean;
}

export interface FileState {
  files: Map<string, import('./api').FileItem>;
  selectedFiles: Set<string>;
  uploadQueue: UploadQueueItem[];
  currentFolder: string;
  folderTree: FolderNode[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: import('./api').SearchFilters;
  isLoading: boolean;
  error: string | null;
}

export interface EmailState {
  emails: Map<string, import('./api').Email>;
  selectedEmails: Set<string>;
  currentFolder: string;
  folders: EmailFolder[];
  drafts: Map<string, import('./api').Email>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isVisible: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
}

export interface UIState {
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  globalLoading: boolean;
  loadingMessage: string;
  toasts: Toast[];
  modals: ModalState[];
  contextMenu: ContextMenuState | null;
}

export interface WebSocketState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastPing: number;
  latency: number;
  messageQueue: QueuedMessage[];
}

// Helper Types for Stores
export interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  startedAt?: number;
  completedAt?: number;
  retries: number;
  chunkIndex?: number;
  totalChunks?: number;
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  children: FolderNode[];
  fileCount: number;
  totalSize: number;
  isExpanded: boolean;
  permissions: import('./api').FilePermissions;
}

export interface EmailFolder {
  id: string;
  name: string;
  icon: string;
  unreadCount: number;
  totalCount: number;
  isSystem: boolean;
  color?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
  createdAt: number;
}

export interface ModalState {
  id: string;
  component: string;
  props?: Record<string, unknown>;
  isOpen: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
  targetId?: string;
  targetType?: string;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  handler?: () => void;
  children?: ContextMenuItem[];
}

export interface QueuedMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

// Store Action Payloads
export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UploadFilesPayload {
  files: File[];
  folder?: string;
  isPublic?: boolean;
  tags?: string[];
  onProgress?: (progress: import('./api').UploadProgress) => void;
}

export interface MoveFilesPayload {
  fileIds: string[];
  targetFolder: string;
  copy?: boolean;
}

export interface SendEmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: File[];
  priority?: import('./api').EmailPriority;
  isDraft?: boolean;
}

export interface ShowToastPayload {
  type: Toast['type'];
  title: string;
  message?: string;
  duration?: number;
  action?: Toast['action'];
}

export interface OpenModalPayload {
  component: string;
  props?: Record<string, unknown>;
  size?: ModalState['size'];
  onClose?: () => void;
  onConfirm?: () => void;
}

// Store Getters Return Types
export interface AuthGetters {
  isAuthenticated: boolean;
  currentUser: User | null;
  userRole: import('./api').UserRole | null;
  hasRole: (role: import('./api').UserRole) => boolean;
  sessionTimeRemaining: number;
  isSessionExpired: boolean;
}

export interface FileGetters {
  fileList: import('./api').FileItem[];
  selectedFilesList: import('./api').FileItem[];
  currentFolderFiles: import('./api').FileItem[];
  sortedFiles: import('./api').FileItem[];
  filteredFiles: import('./api').FileItem[];
  totalStorageUsed: number;
  uploadProgress: number;
  hasActiveUploads: boolean;
}

export interface EmailGetters {
  emailList: import('./api').Email[];
  unreadEmails: import('./api').Email[];
  starredEmails: import('./api').Email[];
  currentFolderEmails: import('./api').Email[];
  draftsList: import('./api').Email[];
  hasUnsentDrafts: boolean;
}

// Composable Return Types
export interface UseAuthReturn {
  user: import('vue').ComputedRef<User | null>;
  isAuthenticated: import('vue').ComputedRef<boolean>;
  isLoading: import('vue').Ref<boolean>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export interface UseFilesReturn {
  files: import('vue').ComputedRef<import('./api').FileItem[]>;
  selectedFiles: import('vue').ComputedRef<import('./api').FileItem[]>;
  isLoading: import('vue').Ref<boolean>;
  uploadFiles: (payload: UploadFilesPayload) => Promise<void>;
  deleteFiles: (fileIds: string[]) => Promise<void>;
  downloadFiles: (fileIds: string[]) => Promise<void>;
  moveFiles: (payload: MoveFilesPayload) => Promise<void>;
  searchFiles: (query: import('./api').SearchQuery) => Promise<void>;
}

export interface UseNotificationsReturn {
  notifications: import('vue').ComputedRef<Notification[]>;
  unreadCount: import('vue').ComputedRef<number>;
  showNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export interface UseWebSocketReturn {
  isConnected: import('vue').ComputedRef<boolean>;
  latency: import('vue').ComputedRef<number>;
  subscribe: <T>(event: import('./api').WebSocketEvent, handler: (data: T) => void) => () => void;
  send: <T>(event: string, data: T) => void;
  connect: () => void;
  disconnect: () => void;
}