import jwt from 'jsonwebtoken';

export default function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      const err = new Error('No token');
      err.statusCode = 401;
      throw err;
    }

    // Validate authorization header format
    if (!authHeader.startsWith('Bearer ')) {
      const err = new Error('Invalid token format');
      err.statusCode = 401;
      throw err;
    }

    const token = authHeader.split(' ')[1];
    
    // Check token length and format
    if (!token || token.length < 10) {
      const err = new Error('Invalid token');
      err.statusCode = 401;
      throw err;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Additional payload validation
    if (!payload.userId || (typeof payload.userId !== 'string' && typeof payload.userId !== 'number')) {
      const err = new Error('Invalid token payload');
      err.statusCode = 401;
      throw err;
    }


    req.user = payload;
    
    // Log authentication for security monitoring (without sensitive data)
    console.log(`Authentication successful from ${req.ip}`);
    
    next();
  } catch (err) {
    // Enhanced error handling for security (log only general failure)
    console.warn(`Authentication failed from ${req.ip}`);
    
    if (!err.statusCode) {
      err.statusCode = err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError'
        ? 401
        : 500;
    }

    // For invalid signature errors (JWT secret changed), provide clear error message
    if (err.name === 'JsonWebTokenError' && err.message === 'invalid signature') {
      err.message = 'Session expired. Please log in again.';
    }
    
    next(err);
  }
}