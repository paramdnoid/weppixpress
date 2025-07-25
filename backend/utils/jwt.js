import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'

export function generateJwtToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '1m' }
  )
}

export function verifyJwtToken(token) {
  return jwt.verify(token, JWT_SECRET)
}