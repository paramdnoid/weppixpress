import Joi from 'joi';
import validator from 'validator';
import { ValidationError } from '../utils/errors.js';

/**
 * Enhanced validation service with custom validators and sanitization
 */
export class ValidationService {
  /**
   * Validate request data against schema
   * @param {*} data - Data to validate
   * @param {Object} schema - Joi schema
   * @param {Object} options - Validation options
   */
  static validate(data, schema, options = {}) {
    const defaultOptions = {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
      ...options
    };

    const { error, value } = schema.validate(data, defaultOptions);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      throw new ValidationError('Validation failed', errors);
    }
    
    return value;
  }

  /**
   * Create middleware for request validation
   * @param {Object} schema - Joi schema
   * @param {string} source - Request source (body, query, params)
   */
  static middleware(schema, source = 'body') {
    return (req, res, next) => {
      try {
        const data = req[source];
        const validated = this.validate(data, schema);
        req[source] = validated;
        next();
      } catch (error) {
        if (error instanceof ValidationError) {
          return res.status(400).json({
            success: false,
            message: error.message,
            code: 'VALIDATION_ERROR',
            errors: error.errors,
            timestamp: new Date().toISOString()
          });
        }
        next(error);
      }
    };
  }

  /**
   * Custom validators
   */
  static customValidators = {
    // Strong password validator
    strongPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),

    // Safe filename validator
    filename: Joi.string()
      .pattern(/^[a-zA-Z0-9._-]+$/)
      .max(255)
      .message('Filename can only contain letters, numbers, dots, underscores, and hyphens'),

    // MongoDB ObjectId validator
    objectId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .message('Invalid ObjectId format'),

    // UUID validator
    uuid: Joi.string()
      .guid({ version: ['uuidv4'] })
      .message('Invalid UUID format'),

    // Phone number validator
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .message('Invalid phone number format'),

    // Safe HTML content
    safeHtml: Joi.string()
      .custom((value, helpers) => {
        // Basic HTML sanitization check
        if (/<script|javascript:|on\w+=/i.test(value)) {
          return helpers.message('HTML content contains potentially dangerous elements');
        }
        return value;
      }),

    // File upload validation
    fileUpload: Joi.object({
      originalname: Joi.string().required(),
      mimetype: Joi.string().required(),
      size: Joi.number().required(),
      buffer: Joi.binary().required()
    }),

    // Pagination parameters
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    }),

    // Date range validation
    dateRange: Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate'))
    }).with('startDate', 'endDate'),

    // Email with domain whitelist
    emailWhitelist: (allowedDomains = []) => {
      return Joi.string()
        .email()
        .custom((value, helpers) => {
          if (allowedDomains.length > 0) {
            const domain = value.split('@')[1];
            if (!allowedDomains.includes(domain)) {
              return helpers.message(`Email domain must be one of: ${allowedDomains.join(', ')}`);
            }
          }
          return value;
        });
    }
  };

  /**
   * Sanitize input data
   * @param {*} data - Data to sanitize
   * @param {Object} options - Sanitization options
   */
  static sanitize(data, options = {}) {
    const {
      trimStrings = true,
      normalizeEmail = true,
      escapeHtml = false
    } = options;

    if (typeof data === 'string') {
      let sanitized = data;
      
      if (trimStrings) {
        sanitized = sanitized.trim();
      }
      
      if (escapeHtml) {
        sanitized = validator.escape(sanitized);
      }
      
      return sanitized;
    }
    
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitize(item, options));
      }
      
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        if (key === 'email' && normalizeEmail && typeof value === 'string') {
          sanitized[key] = validator.normalizeEmail(value) || value;
        } else {
          sanitized[key] = this.sanitize(value, options);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Validate file upload
   * @param {Object} file - Uploaded file object
   * @param {Object} options - Validation options
   */
  static validateFileUpload(file, options = {}) {
    const {
      allowedMimeTypes = [],
      allowedExtensions = []
    } = options;

    const errors = [];

    if (!file || !file.originalname) {
      errors.push({ field: 'file', message: 'File is required' });
      return { valid: false, errors };
    }

    // Check MIME type
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
      errors.push({ 
        field: 'file.mimetype', 
        message: `File type must be one of: ${allowedMimeTypes.join(', ')}` 
      });
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        errors.push({ 
          field: 'file.extension', 
          message: `File extension must be one of: ${allowedExtensions.join(', ')}` 
        });
      }
    }

    // Validate filename
    if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
      errors.push({ 
        field: 'file.filename', 
        message: 'Filename contains invalid characters' 
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Common validation schemas
   */
  static schemas = {
    // ID parameter validation
    id: Joi.object({
      id: Joi.string().required()
    }),

    // Pagination query validation
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      search: Joi.string().max(255).optional(),
      sortBy: Joi.string().max(50).optional(),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    }),

    // User registration
    userRegistration: Joi.object({
      first_name: Joi.string().min(1).max(50).required(),
      last_name: Joi.string().min(1).max(50).required(),
      email: Joi.string().email().required(),
      password: this.customValidators.strongPassword.required(),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
        .messages({ 'any.only': 'Passwords must match' })
    }).with('password', 'confirmPassword'),

    // User login
    userLogin: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      rememberMe: Joi.boolean().default(false)
    }),

    // Password reset request
    passwordResetRequest: Joi.object({
      email: Joi.string().email().required()
    }),

    // Password reset
    passwordReset: Joi.object({
      token: Joi.string().required(),
      password: this.customValidators.strongPassword.required(),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    }),

    // File upload
    fileUpload: Joi.object({
      path: Joi.string().max(500).default(''),
      files: Joi.array().items(this.customValidators.fileUpload).min(1).required()
    })
  };
}

export default ValidationService;