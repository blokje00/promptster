import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Modal to prompt user to start their free 14-day trial
 * Shows when user tries to perform premium actions without a trial
 */
export default function StartTrialModal({ isOpen, onClose, onSuccess }) {
  const [isActivating, setIsActivating] = useState(false);

  const handleStartTrial = async () => {
    setIsActivating(true);
    
    try {
      const response = await base44.functions.invoke('activateTrial', {});
      
      if (response.data.success) {
        toast.success('🎉 Free trial activated!', {
          description: '14 days of full access to all features'
        });
        
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        toast.error(response.data.error || 'Failed to activate trial');
      }
    } catch (error) {
      console.error('[StartTrialModal] Error:', error);
      toast.error('Failed to activate trial. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl">Start Your Free Trial?</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Get 14 days of full access to all premium features. No credit card required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {[
              'Unlimited multi-task prompts',
              'Screenshot analysis & OCR',
              'Project management',
              'Template library',
              'Export & backup tools'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isActivating}
            className="flex-1"
          >
            Not Now
          </Button>
          <Button
            onClick={handleStartTrial}
            disabled={isActivating}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isActivating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Free Trial
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
          Cancel anytime. No automatic charges after trial ends.
        </p>
      </DialogContent>
    </Dialog>
  );
}