-- database/migrations/003_add_user_roles.sql
ALTER TABLE users 
ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user' AFTER email,
ADD INDEX idx_role (role);