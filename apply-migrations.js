#!/usr/bin/env node
/**
 * Apply Database Migrations
 *
 * This script applies all migrations to your Supabase database
 * Run this after setting up your Supabase project
 */

const fs = require('fs');
const path = require('path');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

async function executeSql(sql, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Executing: ${description}`);
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    // Note: Supabase doesn't have a direct SQL execution endpoint via REST
    // This is a limitation - we need to use the Supabase SQL Editor or CLI
    console.log('❌ Cannot execute SQL via REST API');
    console.log('   Supabase requires using the SQL Editor or CLI for migrations');
    return false;
  } catch (error) {
    console.error('❌ Execution failed:', error.message);
    return false;
  }
}

async function checkMigrations() {
  console.log('Checking migration status...\n');

  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const migrations = [
    '001_initial_schema.sql',
    '002_backend_proxy.sql',
    '003_dev_test_user.sql',
  ];

  console.log('📋 Found migrations to apply:');
  migrations.forEach((file, index) => {
    const filePath = path.join(migrationsDir, file);
    const exists = fs.existsSync(filePath);
    console.log(`  ${index + 1}. ${file} ${exists ? '✅' : '❌ MISSING'}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('⚠️  MANUAL MIGRATION REQUIRED');
  console.log('='.repeat(60));
  console.log('\nSupabase does not support programmatic SQL execution via REST API.');
  console.log('You must apply migrations manually using one of these methods:\n');

  console.log('METHOD 1: Supabase Dashboard (Recommended)');
  console.log('  1. Go to: https://app.supabase.com/project/lhcumnvqhulxagvzeffw/sql');
  console.log('  2. Click "New query"');
  console.log('  3. Copy and paste each migration file in order:');
  migrations.forEach((file, index) => {
    console.log(`     ${index + 1}. supabase/migrations/${file}`);
  });
  console.log('  4. Click "Run" after pasting each migration');

  console.log('\nMETHOD 2: Supabase CLI');
  console.log('  1. Install CLI: npm install -g supabase');
  console.log('  2. Login: supabase login');
  console.log('  3. Link project: supabase link --project-ref lhcumnvqhulxagvzeffw');
  console.log('  4. Apply migrations: supabase db push');

  console.log('\n' + '='.repeat(60));
  console.log('After applying migrations, run: node test-credentials-flow.js');
  console.log('='.repeat(60));
}

checkMigrations();
