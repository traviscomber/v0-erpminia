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
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUser(user);
          const userRole = user.user_metadata?.role || 'viewer';
          setRole(userRole);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('[v0] Error getting user:', error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[v0] Auth state changed:', event);
      
      if (!session?.user) {
        setUser(null);
        setRole(null);
      } else {
        setUser(session.user);
        const userRole = session.user.user_metadata?.role || 'viewer';
        setRole(userRole);
      }
    });

    return () => subscription?.unsubscribe();
  }, [supabase]);

  const logout = async () => {
    try {
      console.log('[v0] Logging out user...');
      
      // Clear demo auth
      localStorage.removeItem('auth_token');
      document.cookie = 'demo_auth=; path=/; max-age=0';
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[v0] Logout error:', error);
        throw error;
      }
      
      setUser(null);
      setRole(null);
      console.log('[v0] Logout successful, redirecting...');
      
      // Redirect after state is cleared
      router.push('/auth/login');
    } catch (error) {
      console.error('[v0] Error during logout:', error);
      // Force redirect anyway
      router.push('/auth/login');
    }
  };

  return { user, loading, role, logout };
}
