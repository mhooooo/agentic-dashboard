import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  // TODO: Replace with actual user ID from authentication
  const userId = 'demo-user';

  return <Dashboard userId={userId} />;
}
