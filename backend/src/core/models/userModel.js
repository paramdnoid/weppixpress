import pool from '../../core/services/dbConnection.js';

export async function findUserByEmail(email) {
  const res = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return res[0] || null;
}

export async function createUser(first_name, last_name, email, passwordHash, role = 'user') {
  const result = await pool.query('INSERT INTO users (first_name, last_name, email, role, password) VALUES (?, ?, ?, ?, ?)', [first_name, last_name, email, role, passwordHash]);
  return result.insertId;
}

export async function setVerificationToken(email, token) {
  await pool.query('UPDATE users SET verification_token = ? WHERE email = ?', [token, email]);
}
export async function verifyUserByToken(token) {
  const result = await pool.query('UPDATE users SET is_verified = 1, verification_token = NULL WHERE verification_token = ?', [token]);
  return result.affectedRows > 0;
}
export async function setResetToken(email, token, expires) {
  await pool.query('UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE email = ?', [token, expires, email]);
}
export async function getUserByResetToken(token) {
  const res = await pool.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires_at > NOW()', [token]);
  return res[0] || null;
}
export async function updatePassword(userId, hash) {
  await pool.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?', [hash, userId]);
}
export async function enable2FA(userId, secret) {
  await pool.query('UPDATE users SET is_2fa_enabled = 1, fa2_secret = ? WHERE id = ?', [secret, userId]);
}
export async function disable2FA(userId) {
  await pool.query('UPDATE users SET is_2fa_enabled = 0, fa2_secret = NULL WHERE id = ?', [userId]);
}
export async function getUserById(id) {
  const res = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return res[0] || null;
}

export async function updateUserRole(userId, role) {
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}

export async function getAllUsers() {
  const res = await pool.query('SELECT id, first_name, last_name, email, role, is_verified, created_at FROM users ORDER BY created_at DESC');
  return res;
}