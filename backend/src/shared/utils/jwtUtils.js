import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Central JWT Token Utilities
 */

// Token configuration
const ACCESS_TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
// JWT Secret validation with detailed error handling
let JWT_SECRET, JWT_REFRESH_SECRET;

try {
  JWT_SECRET = process.env.JWT_SECRET;
  JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }

  // Validate secret strength
  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  if (JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
  
  // Ensure secrets are different
  if (JWT_SECRET === JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

} catch (error) {
  // Log error for debugging but don't expose sensitive details
  console.error('JWT Configuration Error:', error.message);
  
  // In production, we might want to use default values or exit gracefully
  if (process.env.NODE_ENV === 'production') {
    console.error('Critical: JWT secrets not properly configured. Application cannot start.');
    process.exit(1);
  } else {
    // In development, provide helpful error message
    throw new Error(`JWT Configuration Error: ${error.message}. Please check your environment variables.`);
  }
}

/**
 * Generates access token
 * @param {Object} user - User object with id
 * @param {Object} options - Additional token options
 * @returns {string} JWT Access Token
 */
function generateAccessToken(user, options = {}) {
  const payload = {
    userId: user.id,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID() // Unique token ID for revocation
  };

  // Add roles/permissions if available
  if (user.role) {
    payload.role = user.role;
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.expiresIn || ACCESS_TOKEN_EXPIRES,
    issuer: process.env.JWT_ISSUER || 'weppixpress',
    audience: process.env.JWT_AUDIENCE || 'weppixpress-api',
    subject: String(user.id)
  });
}

/**
 * Generates Refresh Token
 * @param {Object} user - User object with id  
 * @param {Object} options - Additional token options
 * @returns {string} JWT Refresh Token
 */
function generateRefreshToken(user, options = {}) {
  const payload = {
    userId: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID()
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: options.expiresIn || REFRESH_TOKEN_EXPIRES,
    issuer: process.env.JWT_ISSUER || 'weppixpress',
    audience: process.env.JWT_AUDIENCE || 'weppixpress-api',
    subject: String(user.id)
  });
}

/**
 * Generates Token Pair (Access + Refresh)
 * @param {Object} user - User object
 * @param {Object} options - Token options
 * @returns {Object} Token pair
 */
function generateTokenPair(user, options = {}) {
  return {
    accessToken: generateAccessToken(user, options.access || {}),
    refreshToken: generateRefreshToken(user, options.refresh || {}),
    expiresIn: ACCESS_TOKEN_EXPIRES,
    tokenType: 'Bearer'
  };
}

/**
 * Verify Access Token
 * @param {string} token - JWT Token
 * @returns {Object} Decoded payload
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'weppixpress',
      audience: process.env.JWT_AUDIENCE || 'weppixpress-api'
    });

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Invalid access token: ${error.message}`);
  }
}

/**
 * Verify Refresh Token
 * @param {string} token - JWT Refresh Token
 * @returns {Object} Decoded payload
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: process.env.JWT_ISSUER || 'weppixpress',
      audience: process.env.JWT_AUDIENCE || 'weppixpress-api'
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
}

/**
 * Decode token without verification (for debug/logging)
 * @param {string} token - JWT Token
 * @returns {Object} Decoded payload
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT Token
 * @returns {boolean} True if expired
 */
function isTokenExpired(token) {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Cookie configuration for Refresh Token
 */
const REFRESH_TOKEN_COOKIE_CONFIG =  {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth'
};

/**
 * Set Refresh Token Cookie
 * @param {Object} res - Express response
 * @param {string} refreshToken - Refresh token
 */
function setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_CONFIG);
}

/**
 * Clear Refresh Token Cookie
 * @param {Object} res - Express response
 */
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    ...REFRESH_TOKEN_COOKIE_CONFIG,
    maxAge: 0
  });
}


export {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_CONFIG
};
