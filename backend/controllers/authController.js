import bcrypt from 'bcrypt';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { sendMail } from '../utils/mail.js';
import { validationResult } from 'express-validator';
import {
  findUserByEmail, createUser, setVerificationToken, verifyUserByToken,
  setResetToken, getUserByResetToken, updatePassword,
  enable2FA, disable2FA, getUserById
} from '../models/userModel.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  generateTokenPair,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie
} from '../utils/jwtUtils.js';
import SecureLogger from '../utils/secureLogger.js';

// --- REGISTRIEREN MIT MAIL-BESTÄTIGUNG ---
export async function register(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { first_name, last_name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing data' });
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ message: 'User exists' });
    const hash = await bcrypt.hash(password, 12);
    await createUser(first_name, last_name, email, hash);

    // Mail-Token generieren und senden
    const token = crypto.randomBytes(32).toString('hex');
    await setVerificationToken(email, token);
    await sendMail({
      to: email,
      subject: "Bitte bestätige deine E-Mail",
      html: `<p>Bestätige deine Registrierung:</p><a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Jetzt bestätigen</a>`
    });
    res.status(201).json({ message: 'Registered. Check your E-Mail!' });
  } catch (err) {
    SecureLogger.errorWithContext(err, { action: 'register', ip: req.ip });
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Token fehlt" });
    await verifyUserByToken(token);
    res.json({ message: "E-Mail bestätigt!" });
  } catch (err) {
    next(err);
  }
}

// --- LOGIN MIT 2FA-SUPPORT ---
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
      return res.status(401).json({ message: 'Bitte bestätige deine E-Mail!' });
    }
    if (user.is_2fa_enabled) {
      return res.json({ requires2FA: true, userId: user.id });
    }
    const tokens = generateTokenPair(user);
    setRefreshTokenCookie(res, tokens.refreshToken);
    res.json({ 
      accessToken: tokens.accessToken, 
      user: { id: user.id, email: user.email, name: user.first_name + ' ' + user.last_name } 
    });
  } catch (err) {
    SecureLogger.security('login_failure', { ip: req.ip, userAgent: req.get('User-Agent') });
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
  if (!user || !user.is_2fa_enabled) return res.status(401).json({ message: "Nicht aktiviert" });
  const verified = speakeasy.totp.verify({ secret: user.fa2_secret, encoding: 'base32', token: code });
  if (!verified) return res.status(400).json({ message: "Ungültiger Code" });
  const tokens = generateTokenPair(user);
  setRefreshTokenCookie(res, tokens.refreshToken);
  res.json({ 
    accessToken: tokens.accessToken, 
    user: { id: user.id, email: user.email, name: user.first_name + ' ' + user.last_name } 
  });
}

// --- 2FA SETUP/DEAKTIVIERUNG ---
export async function setup2FA(req, res) {
  const user = await getUserById(req.user.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
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
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.is_2fa_enabled) return res.status(400).json({ message: "2FA bereits aktiviert" });
  const { code, secret } = req.body;
  const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: code });
  if (!verified) return res.status(400).json({ message: "Ungültiger Code" });
  await enable2FA(req.user.userId, secret);
  res.json({ message: "2FA aktiviert" });
}
export async function disable2FAController(req, res) {
  await disable2FA(req.user.userId);
  res.json({ message: "2FA deaktiviert" });
}

// --- PASSWORD RESET ---
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
      subject: "Passwort zurücksetzen",
      html: `<p>Setze dein Passwort zurück:</p><a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Passwort zurücksetzen</a>`
    });
    res.json({ message: "Reset-Mail verschickt." });
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
    if (!user) return res.status(400).json({ message: "Token ungültig oder abgelaufen" });
    const hash = await bcrypt.hash(password, 12);
    await updatePassword(user.id, hash);
    res.json({ message: "Passwort aktualisiert" });
  } catch (err) {
    SecureLogger.errorWithContext(err, { action: 'reset_password', ip: req.ip });
    next(err);
  }
}

// --- JWT REFRESH & LOGOUT ---
export async function refreshToken(req, res) {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
  
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await getUserById(payload.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    
    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token: ' + error.message });
  }
}
export function logout(req, res, next) {
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
    SecureLogger.userActivity('profile_access', user.id);

    // Destructure user to avoid accessing properties directly
    res.status(200).json({accessToken, user: { id: user.id, email: user.email, name: user.first_name + ' ' + user.last_name } });
  } catch (err) {
    SecureLogger.errorWithContext(err, { action: 'get_profile', ip: req.ip });
    return res.status(500).json({ error: 'Internal server error' });
  }
}