-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_organisation_id UUID;
BEGIN
    -- Get the organization ID from the user's metadata
    v_organisation_id := (NEW.raw_user_meta_data->>'organisation_id')::UUID;

    -- If organization_id is provided, create the membership
    IF v_organisation_id IS NOT NULL THEN
        INSERT INTO organisation_memberships (
            member_id,
            organisation_id,
            role
        ) VALUES (
            NEW.id,
            v_organisation_id,
            COALESCE(NEW.raw_user_meta_data->>'role', 'member')
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user(); 