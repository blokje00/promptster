import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sparkles, Clock } from 'lucide-react';

export default function TrialBanner() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: trialStatus } = useQuery({
    queryKey: ['trialStatus', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const response = await base44.functions.invoke('checkTrialStatus', {});
      return response.data;
    },
    enabled: !!user,
  });

  // Only show banner if user is on active trial
  if (!trialStatus?.isTrialActive || trialStatus?.subscription_status !== 'trial') {
    return null;
  }

  const daysRemaining = trialStatus.daysRemaining || 0;

  return (
    <div className="mb-6 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Your free trial started
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl('Subscription'))}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Upgrade now
        </Button>
      </div>
    </div>
  );
}