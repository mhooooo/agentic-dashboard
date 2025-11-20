#!/bin/bash
# Apply OAuth providers migration to Supabase database
# This script runs the SQL migration to add 'linear' and 'calendar' to allowed providers

echo "Applying OAuth providers migration..."

# Read migration SQL
SQL=$(cat supabase/migrations/004_add_oauth_providers.sql)

# Apply via psql if available (requires direct database access)
# OR you can run this SQL manually in Supabase Dashboard → SQL Editor

echo "
============================================
MIGRATION SQL (004_add_oauth_providers.sql)
============================================

$SQL

============================================

To apply this migration:

Option 1 - Supabase Dashboard (Recommended):
1. Go to: https://supabase.com/dashboard/project/_/sql
2. Paste the SQL above
3. Click 'Run'

Option 2 - This script will attempt to apply automatically:
(Requires Supabase connection details)
"

read -p "Apply migration automatically? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Get Supabase URL from .env.local
    SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'=' -f2)
    SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d'=' -f2)

    # Extract project ref from URL (format: https://PROJECT_REF.supabase.co)
    PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

    echo "Applying to project: $PROJECT_REF"

    # Use Supabase SQL endpoint
    curl -X POST "https://$PROJECT_REF.supabase.co/rest/v1/rpc/exec_sql" \
      -H "apikey: $SERVICE_KEY" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"$SQL\"}"

    echo ""
    echo "Migration applied! You may need to restart your dev server."
else
    echo "Migration not applied. Please run the SQL manually in Supabase Dashboard."
fi
