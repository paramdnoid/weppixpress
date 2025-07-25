/**
 * @module routes/auth
 * @description Handles authentication-related routes including login, registration,
 * token refresh, profile retrieval, email verification, and resending verification emails.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/authController.js';
import verifyToken from '../middleware/verifyToken.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many requests, please try again later.' }
});

/**
 * @route POST /login
 * @middleware authLimiter
 * @description Authenticates a user with their credentials.
 */
router.post(
  '/login',
  authLimiter,
  authController.login
);

/**
 * @route POST /register
 * @middleware authLimiter
 * @description Registers a new user.
 */
router.post(
  '/register',
  authLimiter,
  authController.register
);

/**
 * @route GET /me
 * @middleware verifyToken
 * @description Retrieves the profile of the authenticated user.
 */
router.get(
  '/me',
  verifyToken,
  authController.getProfile
);

/**
 * @route GET /verify-email
 * @description Verifies a user's email address.
 */
router.get(
  '/verify-email',
  authController.verifyEmail
);

/**
 * @route POST /resend-verification
 * @description Resends the email verification link to the user.
 */
router.post(
  '/resend-verification',
  authController.resendVerification
);

/**
 * @route POST /refresh
 * @description Issues a new access token using a valid refresh token.
 */
router.post('/refresh', authController.refreshToken)

/**
 * @route POST /revoke
 * @description Revokes a refresh token or all devices.
 */
router.post('/revoke', authController.revokeToken)

/**
 * @route POST /forgot-password
 * @description Initiates password reset email
 */
router.post('/forgot-password', authController.forgotPassword)

/**
 * @route POST /reset-password
 * @description Resets password using reset token
 */
router.post('/reset-password', authController.resetPassword)

export default router;
