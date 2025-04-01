# ContentGardener.ai

A content management and generation system for WordPress websites.

## Features

- Website management
- Content generation
- WordPress integration
- Content calendar
- Post themes management
- Sitemap parsing and content import
- Key content analysis and reference

## How It Works

### 1. Content Generation
1. Navigate to the Content Creation page
2. Choose your content generation method:
   - **Manual Generation**: Enter keywords in the input field and click "Generate Suggestions"
   - **Subject-Based Generation**: Use predefined subject matters to generate content
3. The system analyzes your website's content and generates title suggestions
4. Review and manage the generated suggestions:
   - Like suggestions to add them to your content calendar
   - Dislike suggestions to remove them
   - Edit titles or keywords as needed
   - Adjust publication dates

### 2. Content Management
1. View all your content in the Content Calendar
2. For each content item, you can:
   - Generate full content
   - Generate featured images
   - Send to WordPress
   - Edit or delete content
3. Track content status:
   - Draft
   - Generated
   - Published
   - Scheduled

### 3. Key Content System
1. Mark important pages as "Key Content" in the Website Content Manager
2. The system analyzes these pages to:
   - Understand your writing style
   - Identify content patterns
   - Maintain consistency in new content
3. Use key content as reference for generating new content

### 4. WordPress Integration
1. Configure your WordPress connection in Settings
2. Generate content and images
3. Review and edit generated content
4. Send content directly to WordPress
5. Track publication status

### 5. Content Calendar
1. View all content in a calendar view
2. Filter content by status:
   - All content
   - Not generated
   - Not sent to WordPress
3. Manage content scheduling
4. Track publication dates

## Primary Content Feature

The application now supports designating a piece of content as "primary" for each website. This primary content is used as the base for generating content writing prompts.

### How it works:
1. In the Website Content Manager, each content item has a Primary Content column
2. Click the circle icon to set a content item as primary (indicated by a green checkmark)
3. Only one content item per website can be primary at a time
4. The database automatically ensures this constraint through a trigger

### Implementation Details:
- The `website_content` table has an `is_primary` boolean column (default: false)
- A database trigger ensures only one content item per website can be marked as primary
- The SQL script to add this feature is available in `add_is_primary_column.sql`

## Key Content System

### What is Key Content?
Key content represents the most important, high-quality pages on your website. These pages serve as:
- Foundation for your website's content strategy
- Examples of your ideal content style and structure
- Reference material for AI-generated content

### How It Works

1. **Marking Key Content**
   - In the content manager, mark your best pages as key content
   - These should be well-written, comprehensive pages that represent your desired content quality

2. **Updating Key Content**
   When you click "Update Key Content", the system:
   - Extracts and analyzes the writing style, tone, and structure from your key pages
   - Identifies patterns in content organization, vocabulary, and formatting
   - Creates a content profile that will guide future content generation

3. **Content Generation**
   The analyzed key content influences new content by:
   - Matching the writing style and tone
   - Following similar content structure patterns
   - Maintaining consistent terminology and industry-specific language
   - Ensuring new content aligns with your established content quality

### Best Practices

- Choose 3-5 pages as key content
- Select content that best represents your desired style and quality
- Update key content regularly to maintain freshness
- Ensure key pages cover your main topics or services

### Tips for Selecting Key Content

1. Look for pages that:
   - Are comprehensive and well-written
   - Represent your brand voice accurately
   - Cover core topics in your niche
   - Have performed well with your audience

2. Common types of key content:
   - Detailed guides or tutorials
   - Core service/product pages
   - Key industry resources
   - Foundational topic overviews

## Project Structure

```
contentgardener.ai/
├── src/                    # Source code
│   ├── components/        # React components
│   ├── context/          # React context providers
│   ├── pages/            # Page components
│   ├── integrations/     # External service integrations
│   └── sql/              # SQL scripts
├── supabase/             # Supabase configuration
├── public/               # Static assets
└── sql/                  # Database migrations and functions
```

## Tech Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Shadcn UI components
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Build Tool**: Vite
- **State Management**: React Query
- **Form Handling**: React Hook Form with Zod validation

## Development Setup

1. **Prerequisites**
   - Node.js (v18 or higher)
   - npm or yarn
   - Supabase CLI
   - Git

2. **Environment Setup**
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/wpcontentai.git
   cd wpcontentai

   # Install dependencies
   npm install

   # Copy environment variables
   cp .env.example .env
   ```

3. **Database Setup**
   - Create a new Supabase project
   - Run the SQL scripts in `sql/` directory
   - Update `.env` with your Supabase credentials

4. **Development Server**
   ```bash
   # Start Supabase locally
   npm run supabase:start

   # Start the development server
   npm run dev
   ```

## Database Setup

Before running the application, you need to set up the database tables. Run the following SQL in your Supabase SQL editor:

```sql
-- Create post_themes table
CREATE TABLE IF NOT EXISTS post_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  subject_matter TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'published')),
  scheduled_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE post_themes ENABLE ROW LEVEL SECURITY;

-- Policy for selecting post_themes (users can only see themes for websites they have access to)
CREATE POLICY select_post_themes ON post_themes
  FOR SELECT USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Policy for inserting post_themes
CREATE POLICY insert_post_themes ON post_themes
  FOR INSERT WITH CHECK (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Policy for updating post_themes
CREATE POLICY update_post_themes ON post_themes
  FOR UPDATE USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Policy for deleting post_themes
CREATE POLICY delete_post_themes ON post_themes
  FOR DELETE USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS post_themes_website_id_idx ON post_themes(website_id);
CREATE INDEX IF NOT EXISTS post_themes_subject_matter_idx ON post_themes(subject_matter);
CREATE INDEX IF NOT EXISTS post_themes_status_idx ON post_themes(status);
CREATE INDEX IF NOT EXISTS post_themes_scheduled_date_idx ON post_themes(scheduled_date);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_post_themes_updated_at
  BEFORE UPDATE ON post_themes
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
```