# Onboarding Tables and Functionality

This document describes the database tables and functionality for the user onboarding process.

## Database Tables

### Onboarding Table

The `onboarding` table tracks the progress of a website through the onboarding process:

```sql
CREATE TABLE IF NOT EXISTS onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    website_indexing BOOLEAN DEFAULT FALSE,
    website_indexing_completed_at TIMESTAMP WITH TIME ZONE,
    website_indexing_error TEXT,
    keyword_suggestions BOOLEAN DEFAULT FALSE,
    keyword_suggestions_completed_at TIMESTAMP WITH TIME ZONE,
    keyword_suggestions_error TEXT,
    post_ideas BOOLEAN DEFAULT FALSE,
    post_ideas_completed_at TIMESTAMP WITH TIME ZONE,
    post_ideas_error TEXT,
    client_thumbs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT DEFAULT 'started' NOT NULL,
    CONSTRAINT valid_status CHECK (status IN ('started', 'indexing', 'suggesting_keywords', 'generating_ideas', 'waiting_for_feedback', 'completed', 'error')),
    UNIQUE(website_id)
);
```

#### Key Fields

- `website_id`: ID of the website being onboarded
- `website_indexing`: Flag indicating if website indexing has been completed
- `keyword_suggestions`: Flag indicating if keyword suggestions have been completed
- `post_ideas`: Flag indicating if post ideas have been generated
- `client_thumbs`: JSONB array storing user feedback on content ideas
- `status`: Current status of the onboarding process

#### Valid Status Values

- `started`: Initial state when onboarding begins
- `indexing`: Website is being indexed/analyzed
- `suggesting_keywords`: Generating keyword suggestions based on website content
- `generating_ideas`: Generating content ideas based on keywords
- `waiting_for_feedback`: Waiting for user feedback on generated ideas
- `completed`: Onboarding process completed successfully
- `error`: An error occurred during onboarding

## Functions

### Create Onboarding Entry

The `create-onboarding-entry` Supabase Edge Function creates an entry in the onboarding table for a new website:

```typescript
// POST /functions/v1/create-onboarding-entry
// Body: { website_id: string }
```

This function is automatically called after a website is created in the `completeNewUserSetup` function in the OrganisationContext.

### Deployment

To deploy the function:

```bash
./supabase/functions/deploy-create-onboarding.sh
```

Note: Update the project reference in the deployment script before running.

## Integration Points

1. The onboarding entry is created automatically when a new website is created
2. The Onboarding.tsx component fetches and updates the onboarding status during the process
3. The onboarding flow updates the status as the user progresses through the steps

## Onboarding Flow

1. User enters website URL
2. Backend creates website, organization, and onboarding entry
3. Onboarding UI guides user through:
   - Website indexing
   - Content fingerprinting
   - Keyword suggestions
   - Content idea generation
   - User feedback
4. Onboarding status is updated at each step
5. Upon completion, user is directed to the dashboard 