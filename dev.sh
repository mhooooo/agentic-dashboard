#!/bin/bash
# Development server startup script
# This ensures .env.local takes precedence over system environment variables

unset NEXT_PUBLIC_SUPABASE_URL
unset NEXT_PUBLIC_SUPABASE_ANON_KEY
unset SUPABASE_SERVICE_ROLE_KEY

npm run dev
