-- Add google_id column for Google authentication
-- Run this if the column doesn't exist in the users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Add profile_picture column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);
