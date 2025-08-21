-- Add indexes for better query performance

-- User table optimizations
ALTER TABLE users ADD INDEX idx_email_verified (email, is_verified);
ALTER TABLE users ADD INDEX idx_created_at (created_at);

-- File table optimizations  
ALTER TABLE files ADD INDEX idx_user_path (user_id, path);
ALTER TABLE files ADD INDEX idx_size (size);
ALTER TABLE files ADD INDEX idx_mime_type (mime_type);
ALTER TABLE files ADD INDEX idx_created_updated (created_at, updated_at);

-- Composite indexes for common queries
ALTER TABLE files ADD INDEX idx_user_mime_created (user_id, mime_type, created_at);
ALTER TABLE files ADD INDEX idx_user_size_created (user_id, size, created_at);

-- Full-text search index for file names
ALTER TABLE files ADD FULLTEXT INDEX idx_filename_search (filename, original_name);

-- database/migrations/004_add_file_metadata.sql
-- Add file metadata table for better organization

CREATE TABLE IF NOT EXISTS file_metadata (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id CHAR(36) NOT NULL,
  metadata_key VARCHAR(100) NOT NULL,
  metadata_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  INDEX idx_file_key (file_id, metadata_key),
  INDEX idx_key_value (metadata_key, metadata_value(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add file tags table
CREATE TABLE IF NOT EXISTS file_tags (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id CHAR(36) NOT NULL,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  UNIQUE KEY unique_file_tag (file_id, tag),
  INDEX idx_tag (tag),
  INDEX idx_file_tags (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add file shares table for sharing functionality
CREATE TABLE IF NOT EXISTS file_shares (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id CHAR(36) NOT NULL,
  shared_by CHAR(36) NOT NULL,
  shared_with CHAR(36) NULL, -- NULL for public shares
  share_token VARCHAR(255) UNIQUE,
  permissions JSON NOT NULL, -- {"read": true, "write": false, "delete": false}
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_share_token (share_token),
  INDEX idx_shared_with (shared_with),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add file versions table for version control
CREATE TABLE IF NOT EXISTS file_versions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id CHAR(36) NOT NULL,
  version_number INT NOT NULL DEFAULT 1,
  size BIGINT NOT NULL,
  path VARCHAR(500) NOT NULL,
  checksum VARCHAR(64), -- SHA-256 hash
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) NOT NULL,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY unique_file_version (file_id, version_number),
  INDEX idx_file_versions (file_id, version_number DESC),
  INDEX idx_checksum (checksum)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;