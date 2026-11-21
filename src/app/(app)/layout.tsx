import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { serializeUser } from '@/lib/serializers';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <AppShell user={serializeUser(user)}>{children}</AppShell>;
}
