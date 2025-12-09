import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ThemeToggle from '@/components/theme/ThemeToggle';
import RequireSubscription from '@/components/auth/RequireSubscription';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <RequireSubscription>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              Welcome to Promptster
            </h1>
            {user && (
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Hello, <span className="font-medium">{user.full_name || user.email}</span>
              </p>
            )}
          </div>

          {/* Theme Settings */}
          <ThemeToggle />

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Multi-Task Builder</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Create powerful multi-step prompts by combining tasks, templates, and context
              </p>
              <a 
                href="/Multiprompt" 
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Go to Multi-Task →
              </a>
            </div>

            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Your Vault</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Store and manage your prompts, code snippets, and multi-task workflows
              </p>
              <a 
                href="/Dashboard" 
                className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
              >
                Open Vault →
              </a>
            </div>
          </div>
        </div>
      </div>
    </RequireSubscription>
  );
}