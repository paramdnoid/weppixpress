-- Add indexes for better query performance

-- User table optimizations
ALTER TABLE users 
ADD INDEX idx_email_verified (email, is_verified);

ALTER TABLE users
ADD INDEX idx_created_at (created_at);

-- File table optimizations  
ALTER TABLE files 
ADD INDEX idx_user_path (user_id, path);

ALTER TABLE files
ADD INDEX idx_size (size);

ALTER TABLE files
ADD INDEX idx_mime_type (mime_type);

ALTER TABLE files
ADD INDEX idx_created_updated (created_at, updated_at);

ALTER TABLE files
ADD INDEX idx_user_mime_created (user_id, mime_type, created_at);

ALTER TABLE files
ADD INDEX idx_user_size_created (user_id, size, created_at);

ALTER TABLE files
ADD FULLTEXT INDEX idx_filename_search (filename, original_name);

