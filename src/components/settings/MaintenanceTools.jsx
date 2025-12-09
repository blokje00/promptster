import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function MaintenanceTools({ currentUser }) {
  const queryClient = useQueryClient();
  const [isFixing, setIsFixing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFixVault = async () => {
    setIsFixing(true);
    try {
      const res = await base44.functions.invoke('fixVaultTasks');
      const data = res.data || res;
      
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['openTasksCount'] });
      } else {
        toast.error("Fix failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to run fix script");
    } finally {
      setIsFixing(false);
    }
  };

  const runCleanup = async () => {
    if (!currentUser) return;

    setIsRunning(true);
    try {
      const res = await base44.functions.invoke('hardDeleteOldTasks');
      const data = res.data || res;
      
      if (data.success) {
        toast.success(data.message);
        setShowConfirm(false);
        queryClient.invalidateQueries({ queryKey: ['items'] });
      } else {
        toast.error("Cleanup failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      toast.error("Failed to run cleanup");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <Wrench className="w-5 h-5" />
          Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleFixVault} disabled={isFixing} className="bg-orange-600 hover:bg-orange-700 text-white">
          {isFixing ? "Fixing..." : "Fix Vault Data (Set all to Success)"}
        </Button>
        <p className="text-xs text-orange-600 mt-2">
          Use this once to mark all pending tasks as success and reset the Vault counter.
        </p>
        
        <div className="mt-4 border-t border-orange-200 pt-4">
          <h4 className="text-sm font-bold text-orange-800 mb-2">Hard Delete Cleanup</h4>
          <div className="flex items-center gap-3">
            {!showConfirm ? (
              <Button 
                onClick={() => setShowConfirm(true)} 
                disabled={isRunning}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Hard Delete Cleanup (>30 days)
              </Button>
            ) : (
              <>
                <Button 
                  onClick={runCleanup} 
                  disabled={isRunning}
                  variant="destructive"
                  size="sm"
                >
                  {isRunning ? "Cleaning..." : "Yes, Delete My Old Tasks"}
                </Button>
                <Button 
                  onClick={() => setShowConfirm(false)} 
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </>
            )}
            <span className="text-xs text-slate-500">Your tasks only</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}