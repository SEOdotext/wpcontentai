-- Add image_prompt column to websites table
ALTER TABLE websites ADD COLUMN IF NOT EXISTS image_prompt TEXT DEFAULT 'Create a modern, professional image that represents: {title}. Context: {content}';

-- Add comment to explain the column
COMMENT ON COLUMN websites.image_prompt IS 'Custom prompt template for AI image generation. Use {title} and {content} as placeholders.'; 