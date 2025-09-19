import pool from '../services/dbConnection.js';

export async function findUserByEmail(email) {
  const res = await pool.query('SELECT id, first_name, last_name, email, password, role, is_verified, is_2fa_enabled, fa2_secret FROM users WHERE email = ?', [email]);
  return res[0] || null;
}

export async function createUser(first_name, last_name, email, passwordHash, role = 'user') {
  await pool.query('INSERT INTO users (first_name, last_name, email, role, password) VALUES (?, ?, ?, ?, ?)', [first_name, last_name, email, role, passwordHash]);
  // For UUID primary keys, insertId might not be reliable, get the user by email instead
  const user = await findUserByEmail(email);
  return user?.id || null;
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
  const res = await pool.query('SELECT id, email, reset_token, reset_token_expires_at FROM users WHERE reset_token = ? AND reset_token_expires_at > NOW()', [token]);
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
  const res = await pool.query('SELECT id, first_name, last_name, email, role, is_verified, is_2fa_enabled, fa2_secret FROM users WHERE id = ?', [id]);
  return res[0] || null;
}

export async function updateUserRole(userId, role) {
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}

export async function getAllUsers() {
  const res = await pool.query('SELECT id, first_name, last_name, email, role, is_verified, is_suspended, created_at, last_login_at FROM users ORDER BY created_at DESC');
  return res;
}

export async function suspendUser(userId, reason) {
  await pool.query('UPDATE users SET is_suspended = 1, suspension_reason = ?, suspended_at = NOW() WHERE id = ?', [reason, userId]);
}

export async function reactivateUser(userId) {
  await pool.query('UPDATE users SET is_suspended = 0, suspension_reason = NULL, suspended_at = NULL WHERE id = ?', [userId]);
}

export async function deleteUser(userId) {
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
}

export async function updateLastLogin(userId) {
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);
}

export async function getUsersWithLastActivity() {
  const res = await pool.query(`
    SELECT
      id,
      first_name,
      last_name,
      email,
      role,
      is_verified,
      is_suspended,
      created_at,
      last_login_at,
      CASE
        WHEN last_login_at IS NULL THEN 'Never'
        WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'Online'
        WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 'Recently'
        WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 'Today'
        WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'This week'
        WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'This month'
        ELSE 'Long ago'
      END as activity_status,
      TIMESTAMPDIFF(MINUTE, last_login_at, NOW()) as minutes_since_login
    FROM users
    ORDER BY last_login_at DESC, created_at DESC
  `);
  return res;
}