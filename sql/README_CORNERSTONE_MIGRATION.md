# Migration from is_primary to is_cornerstone

## Background

The codebase has been updated to use `is_cornerstone` instead of `is_primary` for marking important content. This change allows multiple content items to be marked as cornerstone content, whereas the previous `is_primary` field only allowed one primary content item per website due to a database trigger constraint.

## Current Issue

If you're seeing an error like this:

```
PATCH https://your-supabase-url.supabase.co/rest/v1/website_content?id=eq.some-id 400 (Bad Request)
Error updating cornerstone content: {code: '42703', details: null, hint: null, message: 'record "new" has no field "is_primary"'}
```

This is because there's still a database trigger (`website_content_primary_trigger`) that enforces the constraint on `is_primary`, but the field has been removed from the code.

## How to Fix

1. Run the `sql/drop_primary_content_trigger.sql` script in the Supabase SQL editor to drop the trigger and function that enforces the constraint.

2. Verify that the trigger has been dropped by checking that the query at the end of the script returns no rows.

3. The application should now work correctly with the `is_cornerstone` field.

## Migration Steps Already Completed

1. Added the `is_cornerstone` column to the `website_content` table.
2. Copied existing `is_primary` values to `is_cornerstone`.
3. Created an index on `is_cornerstone` for better performance.
4. Updated all code to use `is_cornerstone` instead of `is_primary`.

## Next Steps

After running the `drop_primary_content_trigger.sql` script, you may want to consider:

1. Removing the `is_primary` column from the database schema if it's no longer needed.
2. Updating any remaining database views or functions that might still reference `is_primary`. 