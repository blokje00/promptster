import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Database, CheckCircle2, XCircle, AlertTriangle, Copy } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { getDemoSeedLogs, clearDemoSeedLogs } from "@/components/hooks/useOnboardingBootstrap";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * Debug panel for demo data seeding
 * Shows seeding status, logs, and allows manual retry
 * Visible to admins and in dev mode
 */
export default function DemoSeedDebugPanel() {
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState([]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const refreshLogs = () => {
    setLogs(getDemoSeedLogs());
  };

  React.useEffect(() => {
    refreshLogs();
  }, []);

  const handleRetry = async () => {
    if (!currentUser) {
      toast.error("No user logged in");
      return;
    }

    setIsRetrying(true);
    try {
      const response = await base44.functions.invoke('seedDemoData', {});
      
      if (response.data.status === 'success' || response.data.status === 'already_seeded') {
        toast.success("Demo data seeded successfully!");
        queryClient.invalidateQueries();
        refreshLogs();
      } else {
        toast.error(response.data.message || "Seeding failed");
      }
    } catch (error) {
      toast.error(error.message || "Failed to seed demo data");
    } finally {
      setIsRetrying(false);
      refreshLogs();
    }
  };

  const handleCopyLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] ${l.message} ${JSON.stringify(l.data)}`).join('\n');
    navigator.clipboard.writeText(logText);
    toast.success("Logs copied to clipboard");
  };

  const handleClearLogs = () => {
    clearDemoSeedLogs();
    setLogs([]);
    toast.success("Logs cleared");
  };

  const statusInfo = currentUser ? {
    hasDemo: !!currentUser.demo_seed_version,
    version: currentUser.demo_seed_version,
    userId: currentUser.id,
    email: currentUser.email
  } : null;

  if (!currentUser) {
    return null;
  }

  // Only show to admins or if explicitly enabled via localStorage
  const isDebugMode = currentUser.role === 'admin' || localStorage.getItem('demo_seed_debug') === 'true';
  if (!isDebugMode) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="text-orange-900 dark:text-orange-100 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Demo Data Status
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          Debug panel for demo data seeding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</div>
            {statusInfo?.hasDemo ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Seeded
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-red-300">
                <XCircle className="w-3 h-3 mr-1" />
                Not Seeded
              </Badge>
            )}
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Version</div>
            <code className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border">
              {statusInfo?.version || "none"}
            </code>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleRetry} 
            disabled={isRetrying}
            variant="outline"
            className="flex-1"
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Seeding...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Seed
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            onClick={refreshLogs}
            variant="outline"
          >
            Refresh Logs
          </Button>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Debug Logs ({logs.length})</span>
              <AlertTriangle className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-white dark:bg-slate-900 border rounded-lg p-3 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500">No logs yet</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div key={idx} className="text-xs font-mono border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</div>
                      <div className="text-slate-900 dark:text-slate-100 font-semibold">{log.message}</div>
                      {Object.keys(log.data).length > 0 && (
                        <pre className="text-slate-600 dark:text-slate-400 mt-1 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={handleCopyLogs} className="flex-1">
                <Copy className="w-3 h-3 mr-1" />
                Copy Logs
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearLogs} className="flex-1">
                Clear
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}