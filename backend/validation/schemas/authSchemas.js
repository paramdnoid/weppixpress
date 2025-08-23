import Joi from 'joi';

export const registerSchema = Joi.object({
  first_name: Joi.string().min(1).max(50).required(),
  last_name:  Joi.string().min(1).max(50).required(),
  email:      Joi.string().email().required(),
  password:   Joi.string().min(8).required(),
});

export const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

export const verify2FASchema = Joi.object({
  userId: Joi.string().uuid().required(),
  code:   Joi.string().length(6).required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});
export const resetPasswordSchema = Joi.object({
  token:    Joi.string().required(),
  password: Joi.string().min(8).required(),
});

export const refreshSchema = Joi.object({
  token: Joi.string().required(),
});
export const enable2FASchema = Joi.object({
  code:   Joi.string().length(6).required(),
  secret: Joi.string().required(),
});
