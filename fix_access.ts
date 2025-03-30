import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAccess() {
  try {
    // Get user ID and org ID
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('id, organisation_id')
      .eq('email', 'philipleth+test4@gmail.com')
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error('User not found');

    console.log('Found user:', userData);

    // Update user role to admin
    const { error: roleError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', userData.id);

    if (roleError) throw roleError;
    console.log('Updated user role to admin');

    // Get all websites for the organization
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('id')
      .eq('organisation_id', userData.organisation_id);

    if (websitesError) throw websitesError;
    console.log('Found websites:', websites);

    if (websites && websites.length > 0) {
      // Delete existing access
      const { error: deleteError } = await supabase
        .from('website_access')
        .delete()
        .eq('user_id', userData.id);

      if (deleteError) throw deleteError;
      console.log('Deleted existing access');

      // Insert new access for all websites
      const accessEntries = websites.map(website => ({
        user_id: userData.id,
        website_id: website.id
      }));

      const { error: insertError } = await supabase
        .from('website_access')
        .insert(accessEntries);

      if (insertError) throw insertError;
      console.log('Added access to all websites');
    }

    console.log('Successfully fixed access');
  } catch (error) {
    console.error('Error fixing access:', error);
  }
}

fixAccess(); 