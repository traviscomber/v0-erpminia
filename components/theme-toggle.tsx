'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = resolvedTheme || theme || 'dark';

  useEffect(() => {
    if (!mounted) return;

    const isDark = activeTheme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [activeTheme, mounted]);

  if (!mounted) return null;

  const toggleTheme = () => {
    const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.classList.toggle('light', nextTheme === 'light');
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem('motil-theme', nextTheme);
    setTheme(nextTheme);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggleTheme}
      className="w-full justify-start gap-3"
      aria-label={activeTheme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      {activeTheme === 'dark' ? (
        <>
          <Sun className="h-5 w-5" />
          <span>Modo Claro</span>
        </>
      ) : (
        <>
          <Moon className="h-5 w-5" />
          <span>Modo Oscuro</span>
        </>
      )}
    </Button>
  );
}
