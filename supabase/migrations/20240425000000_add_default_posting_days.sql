-- Set default value for posting_days column
ALTER TABLE publication_settings 
ALTER COLUMN posting_days SET DEFAULT '[{"day": "monday", "count": 1}, {"day": "wednesday", "count": 1}, {"day": "friday", "count": 1}]'::jsonb;