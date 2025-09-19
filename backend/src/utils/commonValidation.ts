import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { sendValidationError } from './httpResponses.js';

/**
 * Common validation utilities to reduce code duplication
 */

/**
 * Check if user ID is present in request
 * @param {import('express').Request} req - Express request
 * @returns {string|null} User ID or null if not present
 */
export function getUserId(req: Request): string | null {
  return (req as any).user?.id || null;
}

/**
 * Validate user ID presence and return error response if missing
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {boolean} True if user ID is missing (error response sent)
 */
export function validateUserId(req: Request, res: Response): boolean {
  if (!getUserId(req)) {
    sendValidationError(res, 'Unauthorized: Missing user ID');
    return true;
  }
  return false;
}

/**
 * Handle express-validator validation errors
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {boolean} True if validation errors exist (error response sent)
 */
export function handleValidationResult(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendValidationError(res, 'Validation failed', errors.array());
    return true;
  }
  return false;
}

/**
 * Validate array parameter
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @returns {Object} Validation result with isValid and error
 */
export function validateArrayParam(
  value: unknown,
  paramName: string = 'parameter'
): { isValid: boolean; error?: string } {
  if (!Array.isArray(value)) {
    return {
      isValid: false,
      error: `${paramName} must be an array`
    };
  }
  return { isValid: true };
}

/**
 * Validate required string parameter
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @returns {Object} Validation result with isValid and error
 */
export function validateRequiredString(
  value: unknown,
  paramName: string = 'parameter'
): { isValid: boolean; error?: string } {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return {
      isValid: false,
      error: `${paramName} is required and must be a non-empty string`
    };
  }
  return { isValid: true };
}

/**
 * Validate numeric parameter
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {Object} options - Validation options (min, max)
 * @returns {Object} Validation result with isValid, error, and parsed value
 */
export function validateNumericParam(
  value: unknown,
  paramName: string = 'parameter',
  options: { min?: number; max?: number } = {}
): { isValid: boolean; error?: string; value?: number } {
  const numValue = Number(value as any);
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return {
      isValid: false,
      error: `${paramName} must be a valid number`
    };
  }
  
  if (options.min !== undefined && numValue < (options.min as number)) {
    return {
      isValid: false,
      error: `${paramName} must be at least ${options.min}`
    };
  }
  
  if (options.max !== undefined && numValue > (options.max as number)) {
    return {
      isValid: false,
      error: `${paramName} must be at most ${options.max}`
    };
  }
  
  return { 
    isValid: true, 
    value: numValue 
  };
}

/**
 * Validate file size parameter
 * @param {number} fileSize - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {Object} Validation result
 */
export function validateFileSize(
  fileSize: number,
  maxSize: number
): { isValid: boolean; error?: string } {
  if (fileSize > maxSize) {
    const maxSizeGB = Math.round(maxSize / (1024 * 1024 * 1024));
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size (${maxSizeGB}GB)`
    };
  }
  return { isValid: true };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email is required'
    };
  }
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }
  
  return { isValid: true };
}

/**
 * Validate role parameter
 * @param {string} role - Role to validate
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Object} Validation result
 */
export function validateRole(
  role: string,
  allowedRoles: string[] = ['user', 'admin']
): { isValid: boolean; error?: string } {
  if (!allowedRoles.includes(role)) {
    return {
      isValid: false,
      error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}`
    };
  }
  return { isValid: true };
}


/**
 * Composite validation for common request patterns
 */

/**
 * Validate user ID and express-validator results
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {boolean} True if any validation failed (error response sent)
 */
export function validateUserIdAndParams(req: Request, res: Response): boolean {
  return handleValidationResult(req, res) || validateUserId(req, res);
}

/**
 * Validate required body parameters
 * @param {Object} body - Request body
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Object} Validation result with missing fields
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; error?: string } {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    const val = body[field];
    if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { isValid: true };
}
