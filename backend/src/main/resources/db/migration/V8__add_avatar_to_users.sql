-- Add avatar_url column to users table for storing profile picture as a data URL (base64).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
