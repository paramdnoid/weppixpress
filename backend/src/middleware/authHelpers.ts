/**
 * Authentication Helper Utilities
 * Consolidates common auth patterns to reduce duplication
 */

import { Request, Response, NextFunction } from 'express'
import { authenticateToken } from './authenticate.js'
// import { requireAdmin } from './index.js' // Commented out due to missing export

// Extended Request interface for authenticated routes
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role?: string;
    [key: string]: any;
  };
}

/**
 * Higher-order function for routes requiring authentication
 * @param handler - Route handler function
 * @returns Array of middleware functions
 */
export const withAuth = (handler: (req: Request, res: Response, next?: NextFunction) => any) => {
  return [authenticateToken, handler]
}

/**
 * Higher-order function for routes requiring admin authentication
 * @param handler - Route handler function
 * @returns Array of middleware functions
 */
export const withAdminAuth = (handler: (req: Request, res: Response, next?: NextFunction) => any) => {
  // TODO: requireAdmin middleware needs to be implemented or imported properly
  return [authenticateToken, handler]
}

/**
 * Higher-order function for routes with optional authentication
 * @param handler - Route handler function
 * @returns Array of middleware functions
 */
export const withOptionalAuth = (handler: (req: Request, res: Response, next?: NextFunction) => any) => {
  const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Try to authenticate, but don't fail if no token
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authenticateToken(req, res, next)
    }
    next()
  }

  return [optionalAuthMiddleware, handler]
}

/**
 * Composite middleware for authenticated file operations
 * @param handler - Route handler function
 * @returns Array of middleware functions
 */
export const withFileAuth = (handler: (req: Request, res: Response, next?: NextFunction) => any) => {
  return [
    authenticateToken,
    // Add file-specific middleware here if needed
    handler
  ]
}

/**
 * Composite middleware for authenticated upload operations
 * @param handler - Route handler function
 * @returns Array of middleware functions
 */
export const withUploadAuth = (handler: (req: Request, res: Response, next?: NextFunction) => any) => {
  return [
    authenticateToken,
    // Add upload-specific middleware here if needed
    handler
  ]
}

/**
 * Common auth validation patterns
 */
export const authValidators = {
  /**
   * Check if user owns resource
   */
  ownsResource: (req: AuthenticatedRequest, resourceUserId: string): boolean => {
    return req.user?.id === resourceUserId
  },

  /**
   * Check if user has admin role
   */
  isAdmin: (req: AuthenticatedRequest): boolean => {
    return req.user?.role === 'admin'
  },

  /**
   * Check if user can access resource (owner or admin)
   */
  canAccessResource: (req: Request, resourceUserId: string): boolean => {
    return authValidators.ownsResource(req, resourceUserId) || authValidators.isAdmin(req)
  }
}

/**
 * Express middleware factory for resource ownership validation
 */
export const requireResourceOwnership = (getUserIdFromParams: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const resourceUserId = getUserIdFromParams(req)

    if (!authValidators.canAccessResource(req, resourceUserId)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' })
    }

    next()
  }
}