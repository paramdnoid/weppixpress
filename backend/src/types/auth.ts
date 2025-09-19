import { Request } from 'express';
import { User } from '@shared/types';

// Extend Express Request with custom properties
export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
  token?: string;
  sessionId?: string;
  clientIp?: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

// Refresh Token Payload  
export interface RefreshTokenPayload extends JwtPayload {
  tokenFamily?: string;
}

// Session Data
export interface SessionData {
  userId: string;
  email: string;
  role: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
}

// 2FA Types
export interface TwoFactorSecret {
  ascii: string;
  hex: string;
  base32: string;
  qr_code_ascii: string;
  qr_code_hex: string;
  qr_code_base32: string;
  google_auth_qr: string;
  otpauth_url: string;
}

// Password Reset
export interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
}

// Email Verification
export interface EmailVerificationToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
}