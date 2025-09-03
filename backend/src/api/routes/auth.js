import authenticate from '../middleware/authenticate.js';
import validateRequest from '../../shared/validation/validateRequest.js';
import express from 'express';

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
} from '../../shared/validation/schemas/authSchemas.js';

const router = express.Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);

router.get('/verify-email', verifyEmail);

router.post('/verify-2fa', validateRequest(verify2FASchema), verify2FA);

router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);

router.post('/refresh', refreshToken);
router.post('/logout', logout);

router.post('/setup-2fa', authenticate, setup2FA);
router.post('/enable-2fa', authenticate, validateRequest(enable2FASchema), enable2FAController);
router.post('/disable-2fa', authenticate, disable2FAController);

router.get('/me', authenticate, getProfile);

export default router;