import sendMail from '../utils/mail.js';
import logger from '../utils/logger.js';
import { sendValidationError, sendUnauthorizedError, sendNotFoundError, sendConflictError, sendInternalServerError, handleValidationErrors } from '../utils/httpResponses.js';
import { getEmailTemplate } from '../utils/emailTemplates.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

import {
  findUserByEmail, createUser, setVerificationToken, verifyUserByToken,
  setResetToken, getUserByResetToken, updatePassword,
  enable2FA, disable2FA, getUserById
} from '../models/userModel.js';
import { 
  generateAccessToken, 
  generateTokenPair,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie
} from '../utils/jwtUtils.js';

export async function register(req, res, next) {
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

export async function verifyEmail(req, res, next) {
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

export async function login(req, res, next) {
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

export async function verify2FA(req, res) {
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

export async function setup2FA(req, res) {
  const user = await getUserById(req.user.userId);
  if (!user) {
    return sendNotFoundError(res, 'User not found');
  }
  const secret = speakeasy.generateSecret({ name: `DemoApp (${user.email})` });
  const qr = await QRCode.toDataURL(secret.otpauth_url);
  res.json({ secret: secret.base32, qr });
}
export async function enable2FAController(req, res) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }
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
  await enable2FA(req.user.userId, secret);
  res.json({ message: '2FA has been enabled successfully' });
}
export async function disable2FAController(req, res) {
  await disable2FA(req.user.userId);
  res.json({ message: '2FA has been disabled successfully' });
}

export async function forgotPassword(req, res, next) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }
  try {
    const { email } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 30);
    await setResetToken(email, token, expires);
    await sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click the link below to reset your password:</p><a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password</a>`
    });
    res.json({ message: 'Password reset email has been sent' });
  } catch (err) {
    next(err);
  }
}
export async function resetPassword(req, res, next) {
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

export async function refreshToken(req, res) {
  const { refreshToken: refreshTokenCookie } = req.cookies;
  if (!refreshTokenCookie) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }
  
  try {
    const payload = verifyRefreshToken(refreshTokenCookie);
    const user = await getUserById(payload.userId);
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
export function logout(_req, res, next) {
  try {
    clearRefreshTokenCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res) {
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
        role: user.role || 'user'
      }
    });
  } catch (err) {
    logger.error('Get profile error', { action: 'get_profile', ip: req.ip, error: err.message });
    return sendInternalServerError(res, 'Internal server error', req);
  }
}