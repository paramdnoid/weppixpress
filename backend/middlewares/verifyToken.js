import { verifyJwtToken } from '../utils/jwt.js'

/**
 * Middleware to verify the JWT token from the Authorization header.
 * Attaches the decoded user information to the request object if the token is valid.
 * Responds with appropriate HTTP status and message if the token is missing or invalid.
 *
 * @param {import('express').Request} req - The Express request object
 * @param {import('express').Response} res - The Express response object
 * @param {import('express').NextFunction} next - The next middleware function
 * @returns {void}
 */
function verifyToken(req, res, next) {
  const authorizationHeader = req.headers['authorization'];
  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: '[Auth] Missing or malformed token.' });
  }

  try {
    const user = verifyJwtToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ message: '[Auth] Invalid token.' });
  }
}

export default verifyToken;

// End of verifyToken middleware module