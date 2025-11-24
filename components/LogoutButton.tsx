'use client';

/**
 * Logout Button Component
 *
 * Client component that handles user logout.
 */

import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('Failed to sign out');
        return;
      }

      toast.success('Signed out successfully');
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('[Logout] Error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      Sign out
    </button>
  );
}
