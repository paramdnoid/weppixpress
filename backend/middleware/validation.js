import path from 'path';
import { validationResult } from 'express-validator';
import validator from 'validator';

// Path traversal protection
export function sanitizePath(inputPath) {
  if (!inputPath) return '/';
  
  // Remove any null bytes
  let sanitized = inputPath.replace(/\0/g, '');
  
  // Normalize the path
  sanitized = path.normalize(sanitized);
  
  // Remove any .. sequences
  sanitized = sanitized.split(path.sep)
    .filter(part => part !== '..' && part !== '.')
    .join(path.sep);
  
  // Ensure it starts with /
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }
  
  return sanitized;
}

// File upload validation
export function validateFile(file) {
  const errors = [];
  
  
  // Check file extension
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', 
    '.doc', '.docx', '.xls', '.xlsx', '.txt', '.md',
    '.zip', '.rar', '.7z', '.tar', '.gz'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    errors.push(`File type ${ext} is not allowed`);
  }
  
  // Check for double extensions
  if ((file.originalname.match(/\./g) || []).length > 1) {
    const parts = file.originalname.split('.');
    if (parts.some(part => ['php', 'exe', 'sh', 'bat'].includes(part.toLowerCase()))) {
      errors.push('Potentially dangerous file detected');
    }
  }
  
  // Validate MIME type
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/markdown',
    'application/zip', 'application/x-rar-compressed'
  ];
  
  if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`MIME type ${file.mimetype} is not allowed`);
  }
  
  return errors;
}

// Validation error handler
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
}

// Custom validators
export const customValidators = {
  isStrongPassword: (value) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    return value.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  },
  
  isValidEmail: (value) => {
    return validator.isEmail(value) && 
           !validator.isEmail(value, { host_blacklist: ['tempmail.com', 'guerrillamail.com'] });
  },
  
  isValidFileName: (value) => {
    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1F]/;
    if (invalidChars.test(value)) return false;
    
    // Check for reserved names (Windows)
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
    const nameWithoutExt = path.basename(value, path.extname(value));
    if (reserved.includes(nameWithoutExt.toUpperCase())) return false;
    
    // Check length
    if (value.length > 255) return false;
    
    return true;
  }
};