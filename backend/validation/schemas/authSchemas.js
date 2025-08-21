import Joi from 'joi';

// Registration
export const registerSchema = Joi.object({
  first_name: Joi.string().min(1).max(50).required(),
  last_name:  Joi.string().min(1).max(50).required(),
  email:      Joi.string().email().required(),
  password:   Joi.string().min(8).required(),
});

// Login
export const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

// 2FA verification
export const verify2FASchema = Joi.object({
  userId: Joi.string().uuid().required(),
  code:   Joi.string().length(6).required(),
});

// Password reset flows
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});
export const resetPasswordSchema = Joi.object({
  token:    Joi.string().required(),
  password: Joi.string().min(8).required(),
});

// Token management
export const refreshSchema = Joi.object({
  token: Joi.string().required(),
});
// Logout might not require a body schema

// 2FA setup and management
export const enable2FASchema = Joi.object({
  code:   Joi.string().length(6).required(),
  secret: Joi.string().required(),
});
// disable-2fa and setup-2fa do not need body validation