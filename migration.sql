CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(60) DEFAULT NULL,
  last_name VARCHAR(60) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  is_verified TINYINT DEFAULT 0,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires_at DATETIME,
  is_2fa_enabled TINYINT DEFAULT 0,
  fa2_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);