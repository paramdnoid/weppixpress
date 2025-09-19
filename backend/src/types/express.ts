import type { Request, Response, NextFunction } from 'express';
// Minimal user shape to avoid cross-package import issues here
type UserLike = {
  id: string;
  email?: string;
  role?: string;
  [key: string]: any;
};

// Express Types
export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export type MiddlewareHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

// Convenience request type that includes our auth augmentation
export type AuthedRequest = Request & {
  user?: UserLike;
  token?: string;
  requestId?: string;
  startTime?: number;
};

// Error Types
// Re-export canonical error classes from utils to avoid duplication here
export {
  AppError,
  ValidationError as AppValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  CacheError,
  FileSystemError,
  ExternalServiceError,
  ConfigurationError,
  SecurityError,
  BusinessLogicError
} from '../utils/errors.js';
