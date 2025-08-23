import pool from '../db.js';

export async function createFile(fileData) {
  const { user_id, filename, original_name, path, size, mime_type } = fileData;
  
  const result = await pool.query(
    `INSERT INTO files (user_id, filename, original_name, path, size, mime_type) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, filename, original_name, path, size, mime_type]
  );
  
  return getFileById(result.insertId);
}

export async function getFileById(id) {
  const result = await pool.query('SELECT * FROM files WHERE id = ?', [id]);
  return result[0] || null;
}

export async function getFilesByUserId(userId, limit = 50, offset = 0) {
  const result = await pool.query(
    `SELECT * FROM files WHERE user_id = ? 
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return result;
}

export async function deleteFile(id) {
  await pool.query('DELETE FROM files WHERE id = ?', [id]);
}

export async function getFileStats(userId) {
  const result = await pool.query(
    `SELECT 
       COUNT(*) as total_files,
       SUM(size) as total_size
     FROM files WHERE user_id = ?`,
    [userId]
  );
  return result[0];
}