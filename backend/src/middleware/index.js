import express from 'express';
import { errorMonitoring, requestMonitoring } from './monitoring.js';
import { apiVersioning, corsPreflightHandler, requestContext, requestTimeout } from './requestContext.js';
import { securityMiddlewareStack } from './inputSanitization.js';
import { authenticateToken } from './authenticate.js';

export function setupMiddleware(app) {
  // Request context and tracking
  app.use(requestContext);
  app.use(requestMonitoring);
  app.use(requestTimeout(60 * 1000));
  app.use(corsPreflightHandler);
  app.use(apiVersioning);

  // Body parsing - optimized for streaming uploads
  app.use('/api/upload/*/stream', express.raw({
    type: 'application/octet-stream',
    limit: '100mb'
  }));

  // Apply security middleware with selective checks for upload routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/upload')) {
      return securityMiddlewareStack[0](req, res, () =>
        securityMiddlewareStack[2](req, res, next)
      );
    }
    return securityMiddlewareStack[0](req, res, () =>
      securityMiddlewareStack[1](req, res, () =>
        securityMiddlewareStack[2](req, res, next)
      )
    );
  });

  app.use(errorMonitoring);
}

export { authenticateToken };