-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous onboarding starts" ON public.onboarding;
DROP POLICY IF EXISTS "Users can view onboarding data for their websites" ON public.onboarding;
DROP POLICY IF EXISTS "Users can update onboarding data for their websites" ON public.onboarding;
DROP POLICY IF EXISTS "Service role can do everything with onboarding" ON public.onboarding;

-- Enable RLS
ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY;

-- Allow anonymous onboarding starts
CREATE POLICY "Allow anonymous onboarding starts" ON public.onboarding
    FOR INSERT
    TO anon
    WITH CHECK (status = 'started');

-- Allow users to view their own onboarding data
CREATE POLICY "Users can view onboarding data for their websites" ON public.onboarding
    FOR SELECT
    TO authenticated
    USING (website_id IN (
        SELECT website_access.website_id
        FROM website_access
        WHERE website_access.user_id = auth.uid()
    ));

-- Allow users to update their own onboarding data
CREATE POLICY "Users can update onboarding data for their websites" ON public.onboarding
    FOR UPDATE
    TO authenticated
    USING (website_id IN (
        SELECT website_access.website_id
        FROM website_access
        WHERE website_access.user_id = auth.uid()
    ));

-- Allow service role full access
CREATE POLICY "Service role can do everything with onboarding" ON public.onboarding
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true); 