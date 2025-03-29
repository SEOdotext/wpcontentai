-- Update all content types to 'page'
UPDATE website_content SET content_type = 'page';

-- Verify the update
SELECT content_type, COUNT(*) 
FROM website_content 
GROUP BY content_type; 