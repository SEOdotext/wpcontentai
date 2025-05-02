-- Improve writing_style column in publication_settings table
BEGIN;

-- Add length constraint and minimum length check
ALTER TABLE publication_settings
  ADD CONSTRAINT writing_style_length_check 
  CHECK (length(writing_style) BETWEEN 20 AND 2000);

-- Update default value to match the one used in the codebase
ALTER TABLE publication_settings
  ALTER COLUMN writing_style
  SET DEFAULT 'SEO friendly content that captures the reader. Use simple, clear language with a genuine tone. Write directly to your reader using natural language, as if having a conversation. Keep sentences concise and avoid filler words. Add personal touches like anecdotes or light humor when appropriate. Explain complex ideas in a friendly, approachable way. Stay direct and let your authentic voice come through.';

-- Update any existing 'Informative' values to use the new default
UPDATE publication_settings 
SET writing_style = (
  SELECT column_default::text
  FROM information_schema.columns 
  WHERE table_name = 'publication_settings' 
  AND column_name = 'writing_style'
)
WHERE writing_style = 'Informative';

COMMIT; 