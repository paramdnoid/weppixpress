import jwt from 'jsonwebtoken';
export default function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      const err = new Error('No token');
      err.statusCode = 401;
      throw err;
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    // Für ungültige oder abgelaufene Tokens HTTP 401
    if (!err.statusCode) {
      err.statusCode = err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError'
        ? 401
        : 500;
    }
    next(err);
  }
}