import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Trash2 } from "lucide-react";

export default function DemoSeedDebugPanel() {
  const [status, setStatus] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Only show for tester account
  if (user?.email !== 'patrickz@sunshower.nl') {
    return null;
  }

  const handleReset = async () => {
    if (!confirm('🧪 TESTER MODE: Reset ALL demo data and reseed?')) {
      return;
    }

    setIsResetting(true);
    setStatus('🔄 Resetting...');

    try {
      const result = await base44.functions.invoke('seedDemoData', {});
      
      if (result.status === 'success') {
        setStatus('✅ Reset successful! Reloading in 2 sec...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setStatus('❌ Reset failed: ' + (result.error || 'Unknown error'));
        setIsResetting(false);
      }
    } catch (error) {
      setStatus('❌ Error: ' + error.message);
      setIsResetting(false);
    }
  };

  return (
    <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          🧪 Tester Mode
          <span className="text-xs font-normal text-slate-600">({user.email})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-slate-700 dark:text-slate-300">
          Demo data seeded at: <strong>{user.demo_seeded_at || 'Not seeded'}</strong>
        </p>
        <Button
          onClick={handleReset}
          disabled={isResetting}
          variant="destructive"
          size="sm"
          className="w-full"
        >
          {isResetting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Demo Data
            </>
          )}
        </Button>
        {status && (
          <p className="text-xs mt-2 p-2 rounded bg-slate-100 dark:bg-slate-800">
            {status}
          </p>
        )}
      </CardContent>
    </Card>
  );
}