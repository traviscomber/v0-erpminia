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
        // Get role from user_role cookie (non-HttpOnly)
        const cookies = document.cookie.split(';');
        const roleCookie = cookies.find(c => c.trim().startsWith('user_role='));
        const emailCookie = cookies.find(c => c.trim().startsWith('user_email='));
        
        if (roleCookie && emailCookie) {
          const userRole = decodeURIComponent(roleCookie.split('=')[1]);
          const userEmail = decodeURIComponent(emailCookie.split('=')[1]);
          
          setUser({ email: userEmail });
          setRole(userRole);
          console.log('[v0] Auth loaded from cookies:', { role: userRole, email: userEmail });
        } else {
          setUser(null);
          setRole(null);
          console.log('[v0] No auth cookies found');
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
      console.log('[v0] Logging out user...');
      
      // Call logout API to clear server-side cookies
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('[v0] Logout API failed:', response.status);
      }

      // Clear client-side cookies that can be cleared
      document.cookie = 'user_email=; path=/; max-age=0';
      document.cookie = 'user_role=; path=/; max-age=0';
      
      setUser(null);
      setRole(null);
      console.log('[v0] Logout successful, redirecting...');
      
      // Redirect to login
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('[v0] Error during logout:', error);
      window.location.href = '/auth/login';
    }
  };

  return { user, loading, role, logout };
}
