-- Create a function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete organization memberships
    DELETE FROM organisation_memberships
    WHERE member_id = OLD.id;

    -- Delete website access
    DELETE FROM website_access
    WHERE user_id = OLD.id;

    RETURN OLD;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_user_deleted ON auth.users;

-- Create the trigger
CREATE TRIGGER on_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion(); 