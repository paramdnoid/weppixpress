
import { sendValidationError } from '../utils/index.js'

export default function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    if (error) {
      const errors = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
      return sendValidationError(res, 'Validation failed', errors);
    }
    req.body = value;
    next();
  };
}