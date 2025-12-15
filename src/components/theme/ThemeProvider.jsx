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

import React, { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function ThemeProvider({ children }) {
  const queryClient = useQueryClient();

  // Fetch current user to get their theme preference
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  // Mutation to update user theme preference
  const updateThemeMutation = useMutation({
    mutationFn: async (themeMode) => {
      await base44.auth.updateMe({ theme_mode: themeMode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      storageKey="promptster-theme"
    >
      <ThemeSyncHandler 
        user={user} 
        updateThemeMutation={updateThemeMutation} 
      />
      {children}
    </NextThemesProvider>
  );
}

/**
 * Syncs theme between localStorage and user settings
 */
function ThemeSyncHandler({ user, updateThemeMutation }) {
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