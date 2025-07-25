import { verifyJwtToken } from '../utils/jwt.js'

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

  if (!token) {
    return res.status(401).json({ message: 'Missing or malformed token' })
  }

  try {
    const user = verifyJwtToken(token)
    req.user = user
    next()
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' })
  }
}
export default verifyToken