-- Add weekly_planning_day column to publication_settings table
ALTER TABLE publication_settings
ADD COLUMN weekly_planning_day text DEFAULT 'friday';

-- Add comment to explain the column
COMMENT ON COLUMN publication_settings.weekly_planning_day IS 'The day of the week when weekly content planning occurs (defaults to friday)';

-- Add logging
DO $$
BEGIN
    RAISE NOTICE 'Added weekly_planning_day column to publication_settings table with default value friday';
END $$; 