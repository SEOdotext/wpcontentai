#!/bin/bash

# Set project reference
PROJECT_REF="vehcghewfnjkwlwmmrix"

# Make the create-anonymous-user function publicly accessible
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/functions/create-anonymous-user/policy" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"policy": "public"}' \
  -v

echo "Function policy update complete." 