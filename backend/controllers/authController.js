import jwt from 'jsonwebtoken';
import db from '../models/db.js';
import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import mail from '../utils/mail.js';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const REFRESH_EXPIRES_IN = '7d';
const MAX_DEVICES = 5;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const { sign, verify } = jwt;

function generateAccessToken(payload) {
  return sign({ ...payload, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
}

async function saveRefresh(userId, token, req) {
  // Clean up expired tokens for this user
  await db.query(
    'DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < NOW()',
    [userId]
  );

  await db.saveRefreshToken({
    user_id: userId,
    token,
    user_agent: req.headers['user-agent'],
    ip_address: req.ip,
    expires_at: new Date(Date.now() + SEVEN_DAYS_MS)
  });
}

async function generateRefreshToken(user, req) {
  const token = sign({ id: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  const count = await db.countRefreshTokens(user.id);
  if (count >= MAX_DEVICES) {
    await db.deleteOldestRefreshToken(user.id);
    console.log(`[refreshToken] Device limit reached for user ${user.id}, deleted oldest refresh token`);
  }

  await saveRefresh(user.id, token, req);
  console.log(`[refreshToken] Created refresh token for user ${user.id} from IP ${req.ip}`);
  return token;
}

function setRefreshTokenCookie(res, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Strict',
    maxAge: SEVEN_DAYS_MS
  });
}

async function revokeAllUserTokens(userId) {
  await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
}

const refreshToken = async (req, res) => {
  const csrf = req.headers['x-csrf-token'];
  if (!csrf || csrf !== process.env.CSRF_SECRET) {
    console.warn('[CSRF] Invalid CSRF token on refresh');
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  const oldToken = req.cookies?.refresh_token || req.body.token;
  if (!oldToken) {
    console.log('[REFRESH] No token provided');
    return res.status(401).json({ error: 'No refresh token provided' });
  }

  try {
    const payload = verify(oldToken, process.env.JWT_REFRESH_SECRET);
    if (payload.type !== 'refresh') {
      console.warn('[TOKEN] Invalid token type on refresh');
      return res.status(401).json({ error: 'Invalid token type' });
    }
    const found = await db.findRefreshToken(oldToken);
    // Optional: Validate user agent and IP
    const userAgentMatches = found?.user_agent === req.headers['user-agent'];
    const ipMatches = found?.ip_address === req.ip;
    if (found && (!userAgentMatches || !ipMatches)) {
      console.warn(`[SECURITY] Mismatch in user-agent or IP for refresh token of user ${payload.id}`);
      await db.deleteRefreshToken(oldToken);
      return res.status(403).json({ error: 'Device mismatch' });
    }
    if (!found && payload.exp > Date.now() / 1000) {
      console.warn(`[SECURITY] Attempted reuse of valid (non-expired) refresh token for user ${payload.id}`);
      await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [payload.id]);
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    await db.deleteRefreshToken(oldToken);
    const newRefreshToken = sign({ id: payload.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
    await saveRefresh(payload.id, newRefreshToken, req);

    const accessToken = generateAccessToken({ id: payload.id });
    setRefreshTokenCookie(res, newRefreshToken);

    console.log(`[ROTATE] Refresh token rotated for user ${payload.id}`);
    return res.json({ accessToken });
  } catch (err) {
    console.warn('[ROTATE] Invalid or expired refresh token:', err.message);
    try {
      await db.deleteRefreshToken(oldToken);
    } catch (deleteErr) {
      console.warn('[TOKEN] Failed to delete expired token:', deleteErr.message);
    }
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const revokeToken = async (req, res) => {
  const csrf = req.headers['x-csrf-token'];
  if (!csrf || csrf !== process.env.CSRF_SECRET) {
    console.warn('[CSRF] Invalid CSRF token on revoke');
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  const token = req.cookies?.refresh_token || req.body.token;
  const allDevices = req.body.allDevices === true;

  if (!token) {
    console.log('[REVOKE] No token provided');
    return res.json({ revoked: false });
  }

  try {
    const payload = verify(token, process.env.JWT_REFRESH_SECRET);
    if (payload.type !== 'refresh') {
      console.warn('[TOKEN] Invalid token type on revoke');
      return res.status(401).json({ error: 'Invalid token type' });
    }

    if (allDevices) {
      await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [payload.id]);
      console.log(`[REVOKE] All devices revoked for user ${payload.id}`);
    } else {
      await db.deleteRefreshToken(token);
      console.log(`[REVOKE] Single device token revoked for user ${payload.id}`);
    }

    res.clearCookie('refresh_token');
    return res.json({ revoked: true });
  } catch (err) {
    console.warn('[REVOKE] Invalid token:', err.message);
    res.clearCookie('refresh_token');
    return res.json({ revoked: false, error: 'Invalid token' });
  }
};

function setAuthCookies(res, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Strict',
    maxAge: SEVEN_DAYS_MS // 7 days
  });
}

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.email_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }
    const match = await compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id });
    const refreshToken = await generateRefreshToken(user, req);

    // Set refresh token as cookie
    setAuthCookies(res, refreshToken);

    console.log(`[LOGIN] User logged in: ${email}`);
    return res.status(200).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        name: user.full_name
      }
    });
  } catch (err) {
    console.error('[LOGIN] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const register = async (req, res) => {
  const { first_name, last_name, email, password } = req.body;
  try {
    // Validate email
    const isEmailValid = EMAIL_REGEX.test(email);
    if (!isEmailValid) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check for existing user
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await hash(password, 10);
    // Generate verification token and expiry
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + ONE_DAY_MS);

    // Create user with verification
    await db.createUserWithVerification(first_name, last_name, email, hashedPassword, "1", verificationToken, verificationExpires);
    await mail.sendVerificationEmail(email, verificationToken);

    console.log(`[REGISTER] User registered: ${email}`);
    return res.status(201).json({ email: `${email}`, message: 'Registered. Please verify your email.' });
  } catch (err) {
    console.error('[REGISTER] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    // req.user.id comes from verifyToken middleware
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Destructure user to avoid accessing properties directly
    const { id, email, full_name, created_at } = user;
    return res.status(200).json({ id, email, name: full_name, created_at });
  } catch (err) {
    console.error('[PROFILE] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const user = await db.getUserByVerificationToken(token);
    if (!user || new Date(user.verify_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    await db.markEmailAsVerified(user.id);
    await db.clearVerificationToken(user.id);
    console.log(`[VERIFY] Email verified: ${user.email}`);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-success`);
  } catch (err) {
    console.error('[VERIFY] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const resendVerification = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + ONE_DAY_MS);
    await db.updateVerificationToken(user.id, token, expires);
    await mail.sendVerificationEmail(email, token);

    console.log(`[RESEND] Verification email resent to: ${email}`);
    return res.status(200).json({ message: 'Verification email resent' });
  } catch (err) {
    console.error('[RESEND] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + ONE_DAY_MS);
    await db.savePasswordResetToken(user.id, token, expires);

    await mail.sendPasswordResetEmail(email, token);
    console.log(`[FORGOT] Reset mail sent to: ${email}`);
    return res.status(200).json({ message: 'Reset link sent' });
  } catch (err) {
    console.error('[FORGOT] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const reset = await db.getPasswordResetByToken(token);
    if (!reset || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashed = await hash(password, 10);
    await db.updateUserPassword(reset.user_id, hashed);
    await db.deletePasswordResetToken(token);
    // Revoke all refresh tokens for the user after password reset
    await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [reset.user_id]);

    console.log(`[RESET] Password updated for user ${reset.user_id}`);
    return res.status(200).json({ message: 'Password has been reset' });
  } catch (err) {
    console.error('[RESET] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  login,
  register,
  getProfile,
  verifyEmail,
  resendVerification,
  setAuthCookies,
  refreshToken,
  revokeToken,
  revokeAllUserTokens,
  forgotPassword,
  resetPassword
};