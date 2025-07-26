/**
 * JWT Utility Module
 * ------------------
 * This module provides helper functions for generating and verifying JSON Web Tokens (JWT)
 * for user authentication and authorization purposes.
 * 
 * It uses a secret key to sign and verify tokens, which should be set via the environment variable `JWT_SECRET`.
 * If not set, a default secret key will be used (not recommended for production).
 */

import jwt from 'jsonwebtoken'

/**
 * Secret key for signing and verifying JWT tokens.
 * Loaded from the environment variable JWT_SECRET, or falls back to a default value.
 * @type {string}
 */
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'

/**
 * Generates a JWT token for the specified user.
 *
 * @param {Object} user - The user object for whom the token is generated.
 * @param {string|number} user.id - The unique user ID.
 * @param {string} user.email - The user's email address.
 * @param {string} user.role - The user's role.
 * @returns {string} The signed JWT token.
 */
export function generateJwtToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '1m' }
  )
}

/**
 * Verifies a JWT token and returns the decoded payload if valid.
 *
 * @param {string} token - The JWT token to verify.
 * @returns {Object} The decoded token payload if verification is successful.
 * @throws {Error} If the token is invalid or expired.
 */
export function verifyJwtToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

// End of JWT Utility Module