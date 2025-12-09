/**
 * Theme Toggle Component
 * 
 * Allows users to choose between:
 * 1. System theme (follows OS preference)
 * 2. Manual light mode
 * 3. Manual dark mode
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const updateThemeMutation = useMutation({
    mutationFn: async (themeMode) => {
      await base44.auth.updateMe({ theme_mode: themeMode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Theme preference saved');
    },
    onError: () => {
      toast.error('Failed to save theme preference');
    }
  });

  const useSystemTheme = theme === 'system';

  const handleSystemToggle = (checked) => {
    if (checked) {
      setTheme('system');
      updateThemeMutation.mutate('system');
    } else {
      // Default to light when disabling system theme
      setTheme('light');
      updateThemeMutation.mutate('light');
    }
  };

  const handleManualThemeChange = (newTheme) => {
    setTheme(newTheme);
    updateThemeMutation.mutate(newTheme);
  };

  if (!mounted) {
    return null;
  }

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Theme Preference
        </CardTitle>
        <CardDescription>
          Choose how the app should look: follow your system settings or set a custom theme
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="system-theme" className="text-base font-medium">
              Use system theme
            </Label>
            <p className="text-sm text-slate-500">
              Automatically match your device's light or dark mode
            </p>
          </div>
          <Switch
            id="system-theme"
            checked={useSystemTheme}
            onCheckedChange={handleSystemToggle}
          />
        </div>

        {/* Manual Theme Selection */}
        {!useSystemTheme && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">Manual theme selection</Label>
            <div className="flex gap-3">
              <button
                onClick={() => handleManualThemeChange('light')}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                  ${theme === 'light' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }
                `}
              >
                <Sun className="w-5 h-5" />
                <span className="font-medium">Light</span>
              </button>
              <button
                onClick={() => handleManualThemeChange('dark')}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                  ${theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }
                `}
              >
                <Moon className="w-5 h-5" />
                <span className="font-medium">Dark</span>
              </button>
            </div>
          </div>
        )}

        {/* Current Theme Preview */}
        <div className="pt-4 border-t">
          <p className="text-sm text-slate-500">
            Current theme: <span className="font-medium text-slate-900 dark:text-slate-100">
              {useSystemTheme 
                ? `System (${resolvedTheme})` 
                : theme.charAt(0).toUpperCase() + theme.slice(1)
              }
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}