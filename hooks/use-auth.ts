import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const getAuthFromCookies = () => {
      try {
        const cookies = document.cookie.split(';');
        const roleCookie = cookies.find(c => c.trim().startsWith('user_role='));
        const emailCookie = cookies.find(c => c.trim().startsWith('user_email='));
        const cargoCookie = cookies.find(c => c.trim().startsWith('user_cargo='));

        if (roleCookie && emailCookie) {
          const userRole = decodeURIComponent(roleCookie.split('=')[1]);
          const userEmail = decodeURIComponent(emailCookie.split('=')[1]);
          const userCargo = cargoCookie ? decodeURIComponent(cargoCookie.split('=')[1]) : null;

          setUser({ email: userEmail, cargo: userCargo });
          setRole(userRole);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('[v0] Error reading auth cookies:', error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    getAuthFromCookies();
  }, []);

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) console.error('[v0] Logout API failed:', response.status);

      document.cookie = 'user_email=; path=/; max-age=0';
      document.cookie = 'user_role=; path=/; max-age=0';
      document.cookie = 'user_cargo=; path=/; max-age=0';

      setUser(null);
      setRole(null);
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('[v0] Error during logout:', error);
      window.location.href = '/auth/login';
    }
  };

  return { user, loading, role, logout };
}
