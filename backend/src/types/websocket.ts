import { Server } from 'ws';
import { Server as HTTPServer } from 'http';

// Local minimal copies to avoid depending on shared package here
export enum WebSocketMessageType {
  FILE_UPLOADED = 'file_uploaded',
  FILE_DELETED = 'file_deleted',
  FILE_MOVED = 'file_moved',
  FILE_RENAMED = 'file_renamed',
  FILE_SHARED = 'file_shared',
  UPLOAD_PROGRESS = 'upload_progress',
  UPLOAD_COMPLETE = 'upload_complete',
  UPLOAD_FAILED = 'upload_failed',
  EMAIL_RECEIVED = 'email_received',
  EMAIL_SENT = 'email_sent',
  USER_STATUS_CHANGED = 'user_status_changed',
  SYSTEM_NOTIFICATION = 'system_notification',
  CONNECTION_STATUS = 'connection_status'
}

export interface WebSocketMessage {
  type: WebSocketMessageType | string;
  payload: unknown;
  timestamp: Date;
  id: string;
}

// WebSocket Connection
export interface WSClient {
  id: string;
  userId: string;
  ws: any; // WebSocket instance
  isAlive: boolean;
  lastPing: Date;
  subscriptions: Set<string>;
  metadata: Record<string, any>;
  messageCount: number;
  lastMessageReset: number;
  connectedAt: number;
}

// WebSocket Manager
export interface IWebSocketManager {
  wss: Server;
  clients: Map<string, WSClient>;
  init(server: HTTPServer): void;
  handleConnection(ws: any, request: any): void;
  sendToUser(userId: string, message: WebSocketMessage): void;
  sendToUsers(userIds: string[], message: WebSocketMessage): void;
  broadcast(message: WebSocketMessage): void;
  broadcastToRoom(room: string, message: WebSocketMessage): void;
  disconnectUser(userId: string): void;
  getActiveConnections(): number;
  getUserConnections(userId: string): WSClient[];
}

// WebSocket Event Handlers
export interface WebSocketHandlers {
  onConnection?: (client: WSClient) => void | Promise<void>;
  onMessage?: (client: WSClient, message: WebSocketMessage) => void | Promise<void>;
  onClose?: (client: WSClient, code: number, reason: string) => void | Promise<void>;
  onError?: (client: WSClient, error: Error) => void | Promise<void>;
  onPing?: (client: WSClient) => void | Promise<void>;
  onPong?: (client: WSClient) => void | Promise<void>;
}

// WebSocket Room
export interface WSRoom {
  id: string;
  name: string;
  members: Set<string>;
  createdAt: Date;
  metadata?: Record<string, any>;
}

// WebSocket Events
export interface FileUploadProgressEvent {
  type: WebSocketMessageType.UPLOAD_PROGRESS;
  payload: {
    fileId: string;
    fileName: string;
    progress: number;
    bytesUploaded: number;
    totalBytes: number;
  };
}

export interface FileUploadCompleteEvent {
  type: WebSocketMessageType.UPLOAD_COMPLETE;
  payload: {
    fileId: string;
    fileName: string;
    url: string;
    size: number;
  };
}

export interface SystemNotificationEvent {
  type: WebSocketMessageType.SYSTEM_NOTIFICATION;
  payload: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    data?: any;
  };
}
