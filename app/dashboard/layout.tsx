import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { verifyAuthCookieValue } from '@/lib/auth-cookie';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token');
  const authSession = await verifyAuthCookieValue(authToken?.value);

  if (!authSession?.user?.id) {
    redirect('/auth/login');
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-0 ml-0">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

