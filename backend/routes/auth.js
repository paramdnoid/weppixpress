/**
 * @module routes/auth
 * @fileoverview Handles authentication routes: login, registration, token refresh,
 * profile retrieval, email verification, password reset, and related endpoints.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/authController.js';
import verifyToken from '../middlewares/verifyToken.js';

const router = Router();

/**
 * Rate limiter middleware for authentication endpoints.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: '[Auth] Too many requests, please try again later.' }
});

/**
 * Authenticate user credentials.
 * @route POST /login
 * @middleware authLimiter
 * @group Auth
 * @returns {Object} 200 - Authenticated user and token
 * @returns {Error}  401 - Invalid credentials
 */
router.post(
  '/login',
  authLimiter,
  authController.login
);

/**
 * Register a new user.
 * @route POST /register
 * @middleware authLimiter
 * @group Auth
 * @returns {Object} 201 - Created user
 * @returns {Error}  400 - Validation error
 */
router.post(
  '/register',
  authLimiter,
  authController.register
);

/**
 * Retrieve authenticated user's profile.
 * @route GET /me
 * @middleware verifyToken
 * @group Auth
 * @returns {Object} 200 - User profile
 * @returns {Error}  401 - Unauthorized
 */
router.get(
  '/me',
  verifyToken,
  authController.getProfile
);

/**
 * Verify user's email address.
 * @route GET /verify-email
 * @group Auth
 * @returns {Object} 200 - Email verified
 * @returns {Error}  400 - Invalid or expired token
 */
router.get(
  '/verify-email',
  authController.verifyEmail
);

/**
 * Resend email verification link.
 * @route POST /resend-verification
 * @group Auth
 * @returns {Object} 200 - Verification email resent
 * @returns {Error}  400 - Invalid request
 */
router.post(
  '/resend-verification',
  authController.resendVerification
);

/**
 * Issue a new access token using a valid refresh token.
 * @route POST /refresh
 * @group Auth
 * @returns {Object} 200 - New access token
 * @returns {Error}  401 - Invalid refresh token
 */
router.post(
  '/refresh',
  authController.refreshToken
);

/**
 * Revoke a refresh token or all devices.
 * @route POST /revoke
 * @group Auth
 * @returns {Object} 200 - Token(s) revoked
 * @returns {Error}  400 - Invalid request
 */
router.post(
  '/revoke',
  authController.revokeToken
);

/**
 * Initiate password reset email.
 * @route POST /forgot-password
 * @group Auth
 * @returns {Object} 200 - Password reset email sent
 * @returns {Error}  400 - Invalid request
 */
router.post(
  '/forgot-password',
  authController.forgotPassword
);

/**
 * Reset password using reset token.
 * @route POST /reset-password
 * @group Auth
 * @returns {Object} 200 - Password reset successful
 * @returns {Error}  400 - Invalid or expired token
 */
router.post(
  '/reset-password',
  authController.resetPassword
);

export default router;

// End of auth routes module.
