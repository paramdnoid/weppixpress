import app from './src/app.js';
import { serverConfig } from './config/index.js';
import logger from './src/utils/logger.js';
import { WebSocketManager } from './src/websockets/websocketService.js';
import { gracefulShutdown } from './src/utils/gracefulShutdown.js';
import websocketProvider from './src/services/websocketProvider.js';

const PORT = serverConfig.port;
const HOST = serverConfig.host;

const server = app.listen(PORT, HOST, () => {
  logger.info(`🚀 Backend + WS running on http://${HOST}:${PORT}`);
  logger.info(`📚 API Docs available at http://${HOST}:${PORT}/api-docs`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please try a different port or stop the existing process.`);
    logger.info('To find processes using this port, run: lsof -ti:' + PORT);
    logger.info('To kill processes using this port, run: kill $(lsof -ti:' + PORT + ')');
    process.exit(1);
  } else {
    logger.error('Server startup error:', err);
    throw err;
  }
});

// Configure server timeouts for security and performance
server.requestTimeout = 120_000; // 2 minutes for request body
server.headersTimeout = 60_000;  // 1 minute for headers
server.keepAliveTimeout = 65_000; // 65 seconds (should be > headersTimeout)
server.maxHeadersCount = 2000;

// Enable TCP_NODELAY for better real-time performance
server.on('connection', (socket) => {
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 60000);
});

const wsManager = new WebSocketManager(server);
websocketProvider.setManager(wsManager);

// Graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown(server, wsManager, 'SIGTERM'));
process.on('SIGINT', () => gracefulShutdown(server, wsManager, 'SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason.message || reason,
    stack: reason.stack,
    promise: promise.toString()
  });

  if (serverConfig.nodeEnv === 'production') {
    logger.error('Unhandled promise rejection. Shutting down gracefully...');
    gracefulShutdown(server, wsManager, 'UNHANDLED_REJECTION');
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  logger.error('Uncaught exception. Shutting down...');
  gracefulShutdown(server, wsManager, 'UNCAUGHT_EXCEPTION');
});

export default app;