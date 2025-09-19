import authenticateToken from '../middleware/authenticate.js';
import validateRequest from '../validators/validateRequest.js';
import express, { Router } from 'express';

import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  setup2FA,
  enable2FAController,
  disable2FAController,
  verify2FA,
  refreshToken,
  logout,
  getProfile
} from '../controllers/authController.js';

import {
  registerSchema,
  loginSchema,
  verify2FASchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  enable2FASchema
} from '../validators/schemas/authSchemas.js';

const router: Router = express.Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);

router.get('/verify-email', verifyEmail);

router.post('/verify-2fa', validateRequest(verify2FASchema), verify2FA);

router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);

router.post('/refresh', refreshToken);
router.post('/logout', logout);

router.post('/setup-2fa', authenticateToken, setup2FA);
router.post('/enable-2fa', authenticateToken, validateRequest(enable2FASchema), enable2FAController);
router.post('/disable-2fa', authenticateToken, disable2FAController);

router.get('/me', authenticateToken, getProfile);

export default router;