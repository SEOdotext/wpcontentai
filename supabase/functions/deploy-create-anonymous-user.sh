#!/bin/bash

# Set the Supabase project reference
SUPABASE_PROJECT_REF="vehcghewfnjkwlwmmrix"

# Deploy the function
echo "Deploying create-anonymous-user function to project $SUPABASE_PROJECT_REF..."
supabase functions deploy create-anonymous-user --project-ref $SUPABASE_PROJECT_REF

# Make the function public (no JWT required)
echo "Making the function public..."
supabase functions update-policy create-anonymous-user --project-ref $SUPABASE_PROJECT_REF --policy public

echo "Deployment completed." 