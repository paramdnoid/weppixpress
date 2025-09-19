import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

type AnyUser = {
  id?: string;
  role?: string;
  isAdmin?: boolean;
  userRole?: string;
  claims?: { role?: string };
  [key: string]: any;
};

interface AuthenticatedRequest extends Request {
  user?: AnyUser;
}

function getTokenFromRequest(req: Request): string | null {
  // 1) Authorization header: Bearer <token>
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2) Cookie (accessToken or token)
  const cookieToken = req.cookies?.accessToken || req.cookies?.token;
  if (cookieToken && typeof cookieToken === 'string') {
    return cookieToken;
  }

  // 3) Query param (useful for WebSocket upgrades or special clients)
  const queryToken = req.query?.access_token || req.query?.token;
  if (queryToken && typeof queryToken === 'string') {
    return queryToken;
  }

  return null;
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = getTokenFromRequest(req);
    if (!token || token.length < 10) {
      throw new AuthenticationError('No token');
    }

    // Verify with optional issuer/audience to match jwtUtils defaults
    const secret = process.env.JWT_SECRET as string;
    const payload = jwt.verify(token, secret, {
      issuer: process.env.JWT_ISSUER || 'weppixpress',
      audience: process.env.JWT_AUDIENCE || 'weppixpress-api'
    }) as jwt.JwtPayload & { userId?: string; role?: string; isAdmin?: boolean; claims?: { role?: string } };

    if (!payload?.userId) {
      throw new AuthenticationError('Invalid token payload');
    }

    // Attach user and helpful aliases
    req.user = (req.user || {}) as AnyUser;
    Object.assign(req.user, payload);
    // Provide common aliases used elsewhere
    req.user.id = req.user.id ?? payload.userId;
    req.user.user_id = req.user.user_id ?? payload.userId;

    res.locals.userId = payload.userId;

    logger.info('Authentication successful', {
      ip: req.ip,
      userId: payload.userId,
      method: req.method,
      path: req.originalUrl
    });

    next();
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('Authentication failed', {
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      name: err.name,
      message: err.message
    });

    if (!(err as any).statusCode) {
      (err as any).statusCode = err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError' ? 401 : 500;
    }

    // Normalize some JWT errors to a friendly message
    if (err.name === 'JsonWebTokenError' && (err.message === 'invalid signature' || err.message === 'jwt malformed')) {
      err.message = 'Session expired. Please log in again.';
    }

    next(err);
  }
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Must be authenticated first
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }

    // Accept a few common ways roles are encoded on the token
    const role = req.user.role || req.user.userRole || req.user?.claims?.role;
    const isAdmin = req.user.isAdmin === true || ["admin", "superadmin", "owner"].includes(String(role || '').toLowerCase());

    if (!isAdmin) {
      throw new AuthorizationError('Forbidden: admin privileges required');
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

export { requireAdmin, authenticateToken };
export default authenticateToken;
