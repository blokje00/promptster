import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sparkles, Lock, CheckCircle2 } from 'lucide-react';

export default function SoftPaywallModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-800">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
            Your trial has ended
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600 dark:text-slate-400">
            Continue using Promptster by choosing a plan that fits your needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">What you still have access to:</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                View your saved prompts and data
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Export your entire vault
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Access settings and billing
              </li>
            </ul>
          </div>

          <div className="rounded-lg border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 p-4">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Unlock premium features:
            </h4>
            <ul className="space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
              <li>• Multi-Task Builder</li>
              <li>• Task Checks & Validation</li>
              <li>• Unlimited prompts & projects</li>
              <li>• Advanced AI workflows</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            onClick={() => navigate(createPageUrl('Subscription'))}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Choose a plan
          </Button>
          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Back to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}