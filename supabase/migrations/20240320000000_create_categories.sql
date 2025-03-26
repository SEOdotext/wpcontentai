-- Create categories table
CREATE TABLE IF NOT EXISTS wordpress_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    wp_category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    parent_id INTEGER,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(website_id, wp_category_id)
);

-- Add RLS policies
ALTER TABLE wordpress_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories for their websites"
    ON wordpress_categories FOR SELECT
    USING (
        website_id IN (
            SELECT website_id FROM website_access WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert categories for their websites"
    ON wordpress_categories FOR INSERT
    WITH CHECK (
        website_id IN (
            SELECT website_id FROM website_access WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories for their websites"
    ON wordpress_categories FOR UPDATE
    USING (
        website_id IN (
            SELECT website_id FROM website_access WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete categories for their websites"
    ON wordpress_categories FOR DELETE
    USING (
        website_id IN (
            SELECT website_id FROM website_access WHERE user_id = auth.uid()
        )
    );

-- Add categories field to wordpress_settings
ALTER TABLE wordpress_settings
ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for wordpress_categories
CREATE TRIGGER update_wordpress_categories_updated_at
    BEFORE UPDATE ON wordpress_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 