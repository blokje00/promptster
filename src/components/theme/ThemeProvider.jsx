/**
 * Theme Provider Component
 * 
 * Manages global theme state using next-themes library.
 * Supports three modes:
 * - "system": follows OS prefers-color-scheme
 * - "light": always light mode
 * - "dark": always dark mode
 * 
 * Theme is stored both in localStorage (for fast initial load) 
 * and synced to user settings (for cross-device consistency).
 */

import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useAuth } from '@/lib/AuthContext';

export function ThemeProvider({ children }) {
  // Current user (and their theme preference) comes from the single auth cache
  const { user } = useAuth();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      storageKey="promptster-theme"
    >
      <ThemeSyncHandler user={user} />
      {children}
    </NextThemesProvider>
  );
}

/**
 * Syncs theme between localStorage and user settings
 */
function ThemeSyncHandler({ user }) {
  useEffect(() => {
    if (user?.theme_mode) {
      // Sync user's saved preference to localStorage if different
      const storedTheme = localStorage.getItem('promptster-theme');
      if (storedTheme !== user.theme_mode) {
        localStorage.setItem('promptster-theme', user.theme_mode);
        // Force theme update
        if (user.theme_mode === 'system') {
          document.documentElement.classList.remove('light', 'dark');
        } else {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(user.theme_mode);
        }
      }
    }
  }, [user?.theme_mode]);

  return null;
}