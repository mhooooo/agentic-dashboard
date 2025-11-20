import { Dashboard } from '@/components/Dashboard';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  // Get authenticated user from session
  const authContext = await getAuthenticatedUser();

  if (!authContext) {
    // Not authenticated - redirect to login (fallback, middleware should catch this)
    redirect('/login');
  }

  return <Dashboard userId={authContext.userId} />;
}
