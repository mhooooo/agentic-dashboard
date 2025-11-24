/**
 * Logout Endpoint
 *
 * POST /api/auth/logout
 *
 * Signs out the current user and clears their session.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/client';

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Logout] Error:', error);
      return NextResponse.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Logout] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
