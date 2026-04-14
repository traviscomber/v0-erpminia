'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-full justify-start gap-3"
    >
      {theme === 'dark' ? (
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
