#!/bin/bash

# Script to deploy Supabase Edge Functions for WordPress integration

echo "🚀 Deploying WordPress Integration Edge Functions..."

# Ensure Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it with:"
    echo "npm install -g supabase"
    exit 1
fi

# Deploy WordPress connect function
echo "📡 Deploying wordpress-connect function..."
supabase functions deploy wordpress-connect

# Check status
if [ $? -eq 0 ]; then
    echo "✅ wordpress-connect function deployed successfully!"
else
    echo "❌ Failed to deploy wordpress-connect function."
    exit 1
fi

# Deploy WordPress posts function
echo "📡 Deploying wordpress-posts function..."
supabase functions deploy wordpress-posts

# Check status
if [ $? -eq 0 ]; then
    echo "✅ wordpress-posts function deployed successfully!"
else
    echo "❌ Failed to deploy wordpress-posts function."
    exit 1
fi

echo "🎉 All WordPress Integration Edge Functions deployed successfully!"
echo "📝 Functions can be invoked at:"
echo "  - https://YOUR_PROJECT_REF.supabase.co/functions/v1/wordpress-connect"
echo "  - https://YOUR_PROJECT_REF.supabase.co/functions/v1/wordpress-posts"
echo ""
echo "ℹ️ Remember to grant the functions appropriate permissions in the Supabase dashboard."

exit 0 