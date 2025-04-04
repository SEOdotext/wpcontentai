import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Generate a random email like temp_<random>@anonymous.com
function generateRandomEmail() {
  const randomId = Math.random().toString(36).substring(2, 10);
  return `temp_${randomId}@anonymous.com`;
}

// Generate a random password (at least 8 chars with uppercase, lowercase, and numbers)
function generateRandomPassword() {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  
  // Ensure at least one uppercase, one lowercase, and one number
  password += "A"; // uppercase
  password += "a"; // lowercase
  password += "1"; // number
  
  // Fill the rest with random chars
  for (let i = 3; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

serve(async (req) => {
  // Create a Supabase client with the Auth context of the logged in user
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );

  try {
    // Generate random email and password for anonymous user
    const email = generateRandomEmail();
    const password = generateRandomPassword();

    // Create a new user with the anonymous flag
    const { data, error } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        is_anonymous: true
      }
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Sign in as the new anonymous user
    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return new Response(JSON.stringify({ error: signInError.message }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Return the session
    return new Response(JSON.stringify({ 
      session: sessionData.session,
      user: sessionData.user,
      is_anonymous: true 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 