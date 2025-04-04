#!/bin/bash

# Deploy the create-onboarding-entry function to Supabase
echo "Deploying create-onboarding-entry function..."
supabase functions deploy create-onboarding-entry --project-ref vehcghewfnjkwlwmmrix

echo "Function deployed successfully!" 