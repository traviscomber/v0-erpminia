import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);
      
      // Get user role from metadata or database
      const userRole = user.user_metadata?.role || 'viewer';
      setRole(userRole);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setUser(null);
        setRole(null);
        router.push('/auth/login');
      } else {
        setUser(session.user);
        const userRole = session.user.user_metadata?.role || 'viewer';
        setRole(userRole);
      }
    });

    return () => subscription?.unsubscribe();
  }, [router, supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return { user, loading, role, logout };
}
