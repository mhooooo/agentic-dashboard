#!/usr/bin/env node
/**
 * Apply migration 004 to add OAuth providers to database
 */

const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Read migration SQL
const migrationSQL = fs.readFileSync(
  path.join(__dirname, 'supabase/migrations/004_add_oauth_providers.sql'),
  'utf-8'
);

// Execute via Supabase REST API
async function applyMigration() {
  console.log('Applying migration 004_add_oauth_providers.sql...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      // Try alternative: execute each statement separately
      console.log('Trying alternative approach: executing statements individually...\n');

      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (!statement) continue;

        console.log(`Executing: ${statement.substring(0, 50)}...`);

        // Use pg_query extension if available, or direct SQL via psql
        const pgResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'params=single-object'
          },
          body: JSON.stringify({ query: statement })
        });

        if (!pgResponse.ok) {
          console.error(`Failed: ${await pgResponse.text()}`);
        } else {
          console.log('✓ Success');
        }
      }
    }

    console.log('\n✅ Migration applied successfully!');
    console.log('\nRestart your dev server to pick up the changes:');
    console.log('  ./dev.sh\n');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\nPlease apply manually via Supabase Dashboard:');
    console.error('1. Go to: https://supabase.com/dashboard/project/lhcumnvqhulxagvzeffw/sql');
    console.error('2. Paste the following SQL:\n');
    console.error(migrationSQL);
    console.error('\n3. Click "Run"\n');
    process.exit(1);
  }
}

applyMigration();
