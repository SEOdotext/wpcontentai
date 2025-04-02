-- Add image generation status columns to post_themes table
ALTER TABLE IF EXISTS post_themes 
ADD COLUMN IF NOT EXISTS image_generation_status TEXT,
ADD COLUMN IF NOT EXISTS image_generation_error TEXT,
ADD COLUMN IF NOT EXISTS image_generation_error_type TEXT; 