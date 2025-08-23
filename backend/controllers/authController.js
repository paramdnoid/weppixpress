import sendMail from '../utils/mail.js';
import logger from '../utils/logger.js';
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { first_name, last_name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }
    const hash = await bcrypt.hash(password, 12);
    await createUser(first_name, last_name, email, hash);

    // Mail-Token generieren und senden
    const token = crypto.randomBytes(32).toString('hex');
    await setVerificationToken(email, token);
    await sendMail({
      to: email,
      subject: 'Please verify your email address',
      html: `<p>Please confirm your registration by clicking the link below:</p><a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a>`
    });
    res.status(201).json({ message: 'Registration successful. Please check your email for verification.' });
  } catch (err) {
    logger.error('Registration error', { action: 'register', ip: req.ip, error: err.message });
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }
    await verifyUserByToken(token);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.is_verified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' });
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
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
    return res.status(404).json({ message: 'User not found' });
  }
  const secret = speakeasy.generateSecret({ name: `DemoApp (${user.email})` });
  const qr = await QRCode.toDataURL(secret.otpauth_url);
  res.json({ secret: secret.base32, qr });
}
export async function enable2FAController(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const user = await getUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
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
    return res.status(500).json({ error: 'Internal server error' });
  }
}