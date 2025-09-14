import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';

function getTokenFromRequest(req) {
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

function authenticateToken(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token || token.length < 10) {
      const err = new Error('No token');
      err.statusCode = 401;
      throw err;
    }

    // Verify with optional issuer/audience to match jwtUtils defaults
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'weppixpress',
      audience: process.env.JWT_AUDIENCE || 'weppixpress-api'
    });

    if (!payload?.userId) {
      const err = new Error('Invalid token payload');
      err.statusCode = 401;
      throw err;
    }

    // Attach user and helpful aliases
    req.user = payload;
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
  } catch (err) {
    logger.warn('Authentication failed', {
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      name: err?.name,
      message: err?.message
    });

    if (!err.statusCode) {
      err.statusCode = err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError' ? 401 : 500;
    }

    // Normalize some JWT errors to a friendly message
    if (err.name === 'JsonWebTokenError' && (err.message === 'invalid signature' || err.message === 'jwt malformed')) {
      err.message = 'Session expired. Please log in again.';
    }

    next(err);
  }
}

function requireAdmin(req, res, next) {
  try {
    // Must be authenticated first
    if (!req.user) {
      const err = new Error('Not authenticated');
      err.statusCode = 401;
      throw err;
    }

    // Accept a few common ways roles are encoded on the token
    const role = req.user.role || req.user.userRole || req.user?.claims?.role;
    const isAdmin = req.user.isAdmin === true || ["admin", "superadmin", "owner"].includes(String(role || '').toLowerCase());

    if (!isAdmin) {
      const err = new Error('Forbidden: admin privileges required');
      err.statusCode = 403;
      throw err;
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

export { requireAdmin, authenticateToken };
export default authenticateToken;