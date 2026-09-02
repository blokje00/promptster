/**
 * Compact Theme Toggle Button
 * Cycles through: system → light → dark → system
 */

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useMutation } from '@tanstack/react-query';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const { updateMe } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateThemeMutation = useMutation({
    // updateMe() also refreshes the shared auth cache
    mutationFn: (themeMode) => updateMe({ theme_mode: themeMode })
  });

  const cycleTheme = () => {
    const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(nextTheme);
    updateThemeMutation.mutate(nextTheme);
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="text-slate-500">
        <Monitor className="w-5 h-5" />
      </Button>
    );
  }

  const Icon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon;
  const label = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Icon className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Theme: {label} (click to cycle)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}