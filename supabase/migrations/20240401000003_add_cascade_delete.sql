-- First drop the existing foreign key constraint if it exists
ALTER TABLE some_posts
DROP CONSTRAINT IF EXISTS some_posts_post_theme_id_fkey;

-- Add the foreign key constraint with CASCADE
ALTER TABLE some_posts
ADD CONSTRAINT some_posts_post_theme_id_fkey
FOREIGN KEY (post_theme_id)
REFERENCES post_themes(id)
ON DELETE CASCADE;

-- Add comment explaining the cascade
COMMENT ON CONSTRAINT some_posts_post_theme_id_fkey ON some_posts
IS 'When a post theme is deleted, automatically delete all associated social media posts'; 