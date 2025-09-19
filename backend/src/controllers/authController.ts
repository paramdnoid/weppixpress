import type { Request, Response, NextFunction } from 'express';
import {
  logger,
  sendMail,
  sendValidationError,
  sendUnauthorizedError,
  sendNotFoundError,
  sendConflictError,
  sendInternalServerError,
  handleValidationErrors,
  getEmailTemplate
} from '../utils/index.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import BackupCodeModel from '../models/backupCodeModel.js';

// Extended Request interface for authenticated routes
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    [key: string]: any;
  };
}
import { validationResult } from 'express-validator';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

import {
  findUserByEmail, createUser, setVerificationToken, verifyUserByToken,
  setResetToken, getUserByResetToken, updatePassword,
  enable2FA, disable2FA, getUserById, updateLastLogin
} from '../models/userModel.js';
import { 
  generateAccessToken, 
  generateTokenPair,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie
} from '../utils/jwtUtils.js';
import adminWebSocketService from '../services/adminWebSocketService.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }
  try {
    const { first_name, last_name, email, password } = req.body;
    if (!email || !password) {
      return sendValidationError(res, 'Email and password are required');
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      return sendConflictError(res, 'User already exists');
    }
    const hash = await bcrypt.hash(password, 12);
    const userId = await createUser(first_name, last_name, email, hash);
    logger.info('User registered successfully', { userId, email, action: 'register' });

    // Mail-Token generieren und senden
    const token = crypto.randomBytes(32).toString('hex');
    await setVerificationToken(email, token);

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    try {
      const emailHtml = await getEmailTemplate('emailVerification', {
        VERIFY_URL: verifyUrl
      });

      await sendMail({
        to: email,
        subject: 'Bitte bestätige deine E-Mail-Adresse - weppiXPRESS',
        html: emailHtml
      });
      res.status(201).json({ message: 'Registration successful. Please check your email for verification.' });
    } catch (emailError) {
      logger.warn('Email sending failed during registration', {
        action: 'register',
        email,
        userId,
        error: emailError.message
      });

      // In development, allow registration to succeed even if email fails
      if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development') {
        res.status(201).json({
          message: 'Registration successful. Email verification disabled in development mode.',
          warning: 'Email sending failed - check SMTP configuration'
        });
      } else {
        throw emailError;
      }
    }
  } catch (err) {
    logger.error('Registration error', { action: 'register', ip: req.ip, error: err.message });
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.query;
    if (!token) {
      return sendValidationError(res, 'Verification token is required');
    }
    const verified = await verifyUserByToken(token);
    if (!verified) {
      return sendValidationError(res, 'Invalid or expired verification token');
    }
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendUnauthorizedError(res, 'Invalid credentials');
    }
    if (!user.is_verified) {
      return sendUnauthorizedError(res, 'Please verify your email before logging in');
    }
    if (user.is_2fa_enabled) {
      return res.json({ requires2FA: true, userId: user.id });
    }

    // Update last login timestamp
    await updateLastLogin(user.id);

    // Broadcast user activity update via WebSocket
    adminWebSocketService.broadcastUserAction('user_login', {
      userId: user.id,
      userEmail: user.email,
      userName: `${user.first_name} ${user.last_name}`.trim(),
      timestamp: Date.now()
    });

    const tokens = generateTokenPair(user);
    setRefreshTokenCookie(res, tokens.refreshToken);
    res.json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role || 'user'
      }
    });
  } catch (err) {
    logger.security('login_failure', { ip: req.ip, userAgent: req.get('User-Agent') });
    next(err);
  }
}

export async function verify2FA(req: Request, res: Response) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }
  const { userId, code } = req.body;
  const user = await getUserById(userId);
  if (!user || !user.is_2fa_enabled) {
    return res.status(401).json({ message: '2FA is not enabled for this account' });
  }
  const verified = speakeasy.totp.verify({ secret: user.fa2_secret, encoding: 'base32', token: code });
  if (!verified) {
    return res.status(400).json({ message: 'Invalid 2FA code' });
  }
  // Update last login timestamp
  await updateLastLogin(user.id);

  // Broadcast user activity update via WebSocket
  adminWebSocketService.broadcastUserAction('user_login', {
    userId: user.id,
    userEmail: user.email,
    userName: `${user.first_name} ${user.last_name}`.trim(),
    timestamp: Date.now()
  });

  const tokens = generateTokenPair(user);
  setRefreshTokenCookie(res, tokens.refreshToken);
  res.json({
    accessToken: tokens.accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`.trim(),
      role: user.role || 'user'
    }
  });
}

export async function setup2FA(req: AuthenticatedRequest, res: Response) {
  const user = await getUserById(req.user.userId);
  if (!user) {
    return sendNotFoundError(res, 'User not found');
  }
  const secret = speakeasy.generateSecret({
    name: `WeppixPress (${user.email})`,
    issuer: 'WeppixPress'
  });
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  res.json({
    secret: secret.base32,
    qrCode,
    manualEntryKey: secret.base32
  });
}
export async function enable2FAController(req: AuthenticatedRequest, res: Response) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found');
    }
    if (user.is_2fa_enabled) {
      return res.status(400).json({ message: '2FA is already enabled' });
    }
    const { code, secret } = req.body;
    const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: code });
    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Enable 2FA first
    await enable2FA(req.user.userId, secret);

    // Generate backup codes automatically
    let backupCodes = [];
    try {
      const backupCodeModel = new BackupCodeModel(req.db);
      backupCodes = await backupCodeModel.generateBackupCodes(req.user.userId);

      logger.info('2FA enabled and backup codes generated', {
        userId: req.user.userId,
        action: 'enable_2fa_with_backup_codes'
      });
    } catch (backupCodeError) {
      logger.error('Failed to generate backup codes after enabling 2FA', {
        userId: req.user.userId,
        action: 'enable_2fa',
        error: backupCodeError.message
      });
      // 2FA is still enabled even if backup code generation fails
    }

    res.json({
      message: '2FA has been enabled successfully',
      backupCodes: backupCodes.length > 0 ? backupCodes : undefined
    });
  } catch (err) {
    logger.error('Enable 2FA error', {
      action: 'enable_2fa',
      userId: req.user?.userId,
      error: err.message
    });
    return sendInternalServerError(res, 'Failed to enable 2FA', req);
  }
}
export async function disable2FAController(req: AuthenticatedRequest, res: Response) {
  try {
    // Disable 2FA first
    await disable2FA(req.user.userId);

    // Delete backup codes
    const backupCodeModel = new BackupCodeModel(req.db);
    await backupCodeModel.deleteUserBackupCodes(req.user.userId);

    logger.info('2FA disabled and backup codes deleted', {
      userId: req.user.userId,
      action: 'disable_2fa_complete'
    });

    res.json({ message: '2FA has been disabled successfully' });
  } catch (err) {
    logger.error('Disable 2FA error', {
      action: 'disable_2fa',
      userId: req.user?.userId,
      error: err.message
    });
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await findUserByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists for security reasons
      return res.json({ message: 'If an account with that email exists, a password reset email has been sent' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiryHours = 2; // Link valid for 2 hours
    const expires = new Date(Date.now() + 1000 * 60 * 60 * expiryHours);
    await setResetToken(email, token, expires);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    try {
      const emailHtml = await getEmailTemplate('passwordReset', {
        USER_NAME: user.first_name || 'Nutzer',
        RESET_URL: resetUrl,
        EXPIRY_TIME: expiryHours
      });

      await sendMail({
        to: email,
        subject: 'Passwort zurücksetzen - weppiXPRESS',
        html: emailHtml
      });

      logger.info('Password reset email sent', { email, action: 'forgot_password' });
      res.json({ message: 'If an account with that email exists, a password reset email has been sent' });
    } catch (emailError) {
      logger.error('Failed to send password reset email', {
        email,
        action: 'forgot_password',
        error: emailError.message
      });

      // In development, provide more detailed error
      if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development') {
        res.status(500).json({
          message: 'Failed to send password reset email',
          error: emailError.message
        });
      } else {
        throw emailError;
      }
    }
  } catch (err) {
    logger.error('Password reset request error', { action: 'forgot_password', ip: req.ip, error: err.message });
    next(err);
  }
}
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }
  try {
    const { token, password } = req.body;
    const user = await getUserByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    const hash = await bcrypt.hash(password, 12);
    await updatePassword(user.id, hash);
    res.json({ message: 'Password has been updated successfully' });
  } catch (err) {
    logger.error('Password reset error', { action: 'reset_password', ip: req.ip, error: err.message });
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken: refreshTokenCookie } = req.cookies;
  if (!refreshTokenCookie) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }
  
  try {
    const payload = verifyRefreshToken(refreshTokenCookie);
    if (typeof payload === 'string') {
      return res.status(401).json({ message: 'Invalid refresh token format' });
    }
    const user = await getUserById((payload as any).userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    const accessToken = generateAccessToken(user);
    res.json({ 
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role || 'user'
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token: ' + error.message });
  }
}
export function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    clearRefreshTokenCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accessToken = generateAccessToken(user);

    // Log user activity (GDPR-compliant)
    logger.userActivity('profile_access', user.id);

    // Destructure user to avoid accessing properties directly
    res.status(200).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role || 'user',
        twoFactorEnabled: user.is_2fa_enabled || false,
        first_name: user.first_name,
        last_name: user.last_name,
        isActive: user.is_active || false,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    logger.error('Get profile error', { action: 'get_profile', ip: req.ip, error: err.message });
    return sendInternalServerError(res, 'Internal server error', req);
  }
}


/**
 * Generate backup codes for 2FA recovery
 */
export async function generateBackupCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has 2FA enabled
    const user = await getUserById(userId);
    if (!user || !user.is_2fa_enabled) {
      return res.status(400).json({ error: 'Two-factor authentication must be enabled first' });
    }

    const backupCodeModel = new BackupCodeModel(req.db);
    const codes = await backupCodeModel.generateBackupCodes(userId);

    logger.userActivity('backup_codes_generated', userId);

    res.json({
      codes,
      generated: true
    });
  } catch (err) {
    logger.error('Generate backup codes error', {
      action: 'generate_backup_codes',
      userId: req.user?.id,
      error: err.message
    });
    next(err);
  }
}

/**
 * Get existing backup codes for a user
 */
export async function getBackupCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const backupCodeModel = new BackupCodeModel(req.db);
    const backupCodes = await backupCodeModel.getBackupCodes(userId);
    const hasBackupCodes = await backupCodeModel.hasBackupCodes(userId);

    // Only return the codes (without showing the actual codes for security)
    res.json({
      codes: backupCodes.map(code => code.code),
      generated: hasBackupCodes
    });
  } catch (err) {
    logger.error('Get backup codes error', {
      action: 'get_backup_codes',
      userId: req.user?.id,
      error: err.message
    });
    next(err);
  }
}

/**
 * Verify backup code during login
 */
export async function verifyBackupCode(req: Request, res: Response, next: NextFunction) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }

  try {
    const { userId, code } = req.body;

    const user = await getUserById(userId);
    if (!user || !user.is_2fa_enabled) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const backupCodeModel = new BackupCodeModel(req.db);
    const isValid = await backupCodeModel.useBackupCode(userId, code);

    if (!isValid) {
      logger.warn('Invalid backup code attempt', {
        action: 'verify_backup_code',
        userId,
        ip: req.ip
      });
      return res.status(400).json({ error: 'Invalid backup code' });
    }

    // Generate access token
    const accessToken = generateAccessToken(user);

    logger.userActivity('login_backup_code', userId);
    logger.info('User login with backup code', {
      userId,
      email: user.email,
      ip: req.ip
    });

    res.json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        twoFactorEnabled: user.is_2fa_enabled
      }
    });
  } catch (err) {
    logger.error('Verify backup code error', {
      action: 'verify_backup_code',
      error: err.message
    });
    next(err);
  }
}

/**
 * Get 2FA status including backup codes status
 */
export async function get2FAStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const backupCodeModel = new BackupCodeModel(req.db);
    const hasBackupCodes = await backupCodeModel.hasBackupCodes(userId);

    res.json({
      enabled: user.is_2fa_enabled,
      hasBackupCodes
    });
  } catch (err) {
    logger.error('Get 2FA status error', {
      action: 'get_2fa_status',
      userId: req.user?.id,
      error: err.message
    });
    next(err);
  }
}