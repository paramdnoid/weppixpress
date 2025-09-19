-- database/migrations/005_add_user_suspension.sql
-- Add user suspension and activity tracking columns

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at DATETIME DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_is_suspended ON users (is_suspended);
CREATE INDEX IF NOT EXISTS idx_last_login_at ON users (last_login_at);
CREATE INDEX IF NOT EXISTS idx_created_at ON users (created_at);