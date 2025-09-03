import Joi from 'joi';

const registerSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).optional()
});

const loginSchema =  Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

const verify2FASchema =  Joi.object({
  userId: Joi.string().uuid().required(),
  code:   Joi.string().length(6).required(),
});

const forgotPasswordSchema =  Joi.object({
  email: Joi.string().email().required(),
});
const resetPasswordSchema =  Joi.object({
  token:    Joi.string().required(),
  password: Joi.string().min(8).required(),
});

const enable2FASchema =  Joi.object({
  code:   Joi.string().length(6).required(),
  secret: Joi.string().required(),
});

export { registerSchema, loginSchema, verify2FASchema, forgotPasswordSchema, resetPasswordSchema, enable2FASchema };