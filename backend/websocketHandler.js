import logger from './utils/logger.js';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';

// backend/websocketHandler.js

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map(); // Map<WebSocket, ClientInfo>
    this.pathSubscriptions = new Map(); // Map<path, Set<WebSocket>>
    
    this.setupWebSocketServer();
    logger.info('WebSocket server initialized on /ws');
  }

  verifyClient(info) {
    // Optional: Add authentication verification here
    // const token = info.req.headers.authorization;
    // return this.validateToken(token);
    return true;
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        connectedAt: Date.now(),
        subscriptions: new Set(),
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent']
      };
      
      this.clients.set(ws, clientInfo);
      logger.info(`WebSocket client connected: ${clientId}`, {
        clientsCount: this.clients.size,
        ip: clientInfo.ip
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'welcome',
        clientId,
        timestamp: Date.now()
      });

      // Handle messages from client
      ws.on('message', (data) => {
        this.handleClientMessage(ws, data);
      });

      // Handle client disconnect
      ws.on('close', (code, reason) => {
        this.handleClientDisconnect(ws, code, reason);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Set up ping/pong for connection health
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Set up ping interval for connection health check
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          logger.info('Terminating dead WebSocket connection');
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleClientMessage(ws, data) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    try {
      const message = JSON.parse(data.toString());
      logger.debug(`Message from client ${clientInfo.id}:`, message);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(ws, message.path);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscription(ws, message.path);
          break;
          
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
          break;
          
        default:
          logger.warn(`Unknown message type: ${message.type}`, { clientId: clientInfo.id });
      }
    } catch (error) {
      logger.error(`Error parsing message from client ${clientInfo.id}:`, error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  handleSubscription(ws, path) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    const normalizedPath = this.normalizePath(path);
    
    // Add to client subscriptions
    clientInfo.subscriptions.add(normalizedPath);
    
    // Add to path subscriptions
    if (!this.pathSubscriptions.has(normalizedPath)) {
      this.pathSubscriptions.set(normalizedPath, new Set());
    }
    this.pathSubscriptions.get(normalizedPath).add(ws);

    
    // Confirm subscription
    this.sendToClient(ws, {
      type: 'subscribed',
      path: normalizedPath,
      timestamp: Date.now()
    });
  }

  handleUnsubscription(ws, path) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    const normalizedPath = this.normalizePath(path);
    
    // Remove from client subscriptions
    clientInfo.subscriptions.delete(normalizedPath);
    
    // Remove from path subscriptions
    const pathSubs = this.pathSubscriptions.get(normalizedPath);
    if (pathSubs) {
      pathSubs.delete(ws);
      if (pathSubs.size === 0) {
        this.pathSubscriptions.delete(normalizedPath);
      }
    }

    
    // Confirm unsubscription
    this.sendToClient(ws, {
      type: 'unsubscribed',
      path: normalizedPath,
      timestamp: Date.now()
    });
  }

  handleClientDisconnect(ws, code, reason) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    logger.info(`Client ${clientInfo.id} disconnected`, {
      code,
      reason: reason.toString(),
      duration: Date.now() - clientInfo.connectedAt
    });

    // Clean up subscriptions
    clientInfo.subscriptions.forEach(path => {
      const pathSubs = this.pathSubscriptions.get(path);
      if (pathSubs) {
        pathSubs.delete(ws);
        if (pathSubs.size === 0) {
          this.pathSubscriptions.delete(path);
        }
      }
    });

    // Remove client
    this.clients.delete(ws);
  }

  sendToClient(ws, message) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending message to client:', error);
      }
    }
  }

  // Optimized broadcasting with batching and filtering
  broadcastToPath(path, message, options = {}) {
    const normalizedPath = this.normalizePath(path);
    const subscribers = this.pathSubscriptions.get(normalizedPath);
    
    if (!subscribers || subscribers.size === 0) {
      logger.debug(`No subscribers for path: ${normalizedPath}`);
      return;
    }

    const broadcastMessage = {
      ...message,
      path: normalizedPath,
      timestamp: Date.now(),
      batchId: options.batchId || crypto.randomUUID().substring(0, 8)
    };

    // Filter active connections only
    const activeSubscribers = Array.from(subscribers).filter(ws => 
      ws.readyState === ws.OPEN
    );

    if (activeSubscribers.length === 0) {
      logger.debug(`No active subscribers for path: ${normalizedPath}`);
      // Clean up dead connections
      this.pathSubscriptions.delete(normalizedPath);
      return;
    }

    logger.info(`Broadcasting to ${activeSubscribers.length} active clients on path: ${normalizedPath}`, {
      messageType: message.type,
      batchId: broadcastMessage.batchId
    });

    // Batch sending for better performance
    const batchSize = 50;
    for (let i = 0; i < activeSubscribers.length; i += batchSize) {
      const batch = activeSubscribers.slice(i, i + batchSize);
      
      // Send to batch with small delay to prevent overwhelming
      setImmediate(() => {
        batch.forEach(ws => {
          this.sendToClient(ws, broadcastMessage);
        });
      });
    }
  }

  // Optimized file event broadcasting
  broadcastFileCreated(file, options = {}) {
    const parentPath = this.getParentPath(file.path);
    const batchId = options.batchId || crypto.randomUUID().substring(0, 8);
    
    // Broadcast to parent directory and root
    this.broadcastToPath(parentPath, {
      type: 'file_created',
      file: file,
      action: 'create'
    }, { batchId });

    // Also broadcast to root if not already parent
    if (parentPath !== '/') {
      this.broadcastToPath('/', {
        type: 'file_created',
        file: file,
        action: 'create',
        affectedPath: parentPath
      }, { batchId });
    }
  }

  broadcastFileUpdated(file, options = {}) {
    const parentPath = this.getParentPath(file.path);
    const batchId = options.batchId || crypto.randomUUID().substring(0, 8);
    
    this.broadcastToPath(parentPath, {
      type: 'file_updated',
      file: file,
      action: 'update'
    }, { batchId });
  }

  broadcastFileDeleted(filePath, options = {}) {
    const parentPath = this.getParentPath(filePath);
    const batchId = options.batchId || crypto.randomUUID().substring(0, 8);
    
    this.broadcastToPath(parentPath, {
      type: 'file_deleted',
      path: filePath,
      action: 'delete'
    }, { batchId });

    // Also broadcast to root
    if (parentPath !== '/') {
      this.broadcastToPath('/', {
        type: 'file_deleted',
        path: filePath,
        action: 'delete',
        affectedPath: parentPath
      }, { batchId });
    }
  }

  broadcastFolderChanged(folderPath, options = {}) {
    const batchId = options.batchId || crypto.randomUUID().substring(0, 8);
    
    this.broadcastToPath(folderPath, {
      type: 'folder_changed',
      path: folderPath,
      action: 'refresh'
    }, { batchId });
  }

  // Batch multiple file operations
  broadcastBatchFileOperations(operations) {
    const batchId = crypto.randomUUID().substring(0, 8);
    
    logger.info(`Broadcasting batch operation with ${operations.length} items`, { batchId });
    
    operations.forEach(op => {
      switch (op.type) {
        case 'create':
          this.broadcastFileCreated(op.file, { batchId });
          break;
        case 'update':
          this.broadcastFileUpdated(op.file, { batchId });
          break;
        case 'delete':
          this.broadcastFileDeleted(op.path, { batchId });
          break;
        case 'folder_change':
          this.broadcastFolderChanged(op.path, { batchId });
          break;
      }
    });
  }

  // Utility methods
  normalizePath(path) {
    if (!path || path === '/') return '/';
    const normalized = path.replace(/\/+$/, '');
    return normalized.startsWith('/') ? normalized : '/' + normalized;
  }

  getParentPath(filePath) {
    const parts = filePath.split('/');
    parts.pop(); // Remove filename
    return parts.join('/') || '/';
  }

  // Health and stats
  getStats() {
    return {
      connectedClients: this.clients.size,
      activeSubscriptions: this.pathSubscriptions.size,
      totalPaths: Array.from(this.pathSubscriptions.keys()),
      uptime: process.uptime()
    };
  }

  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.wss.clients.forEach(ws => {
      ws.close(1001, 'Server shutting down');
    });
    
    this.wss.close();
    logger.info('WebSocket server closed');
  }
}

export { WebSocketManager }