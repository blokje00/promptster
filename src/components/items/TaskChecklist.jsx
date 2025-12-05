import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Circle, RotateCcw, Loader2, ListChecks } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

/**
 * TaskChecklist - Volledig herbouwd voor betrouwbare Retry Flow.
 * 1. Maakt nieuwe thoughts aan.
 * 2. Updates oude status.
 * 3. Zet localStorage correct.
 * 4. Navigeert met state.
 */
export default function TaskChecklist({
  taskChecks = [],
  onTaskChecksChange,
  itemId,
  projectId,
  readOnly = false,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);

  if (!taskChecks || taskChecks.length === 0) return null;

  // Status toggle handler
  const handleStatusChange = async (e, index, newStatus) => {
    e.preventDefault();
    if (readOnly) return;

    const newChecks = [...taskChecks];
    newChecks[index] = {
      ...newChecks[index],
      status: newStatus,
      is_checked: newStatus === "success",
    };

    // Optimistische update naar parent
    onTaskChecksChange(newChecks);

    // DB Save
    if (itemId) {
      try {
        await base44.entities.Item.update(itemId, { task_checks: newChecks });
        queryClient.invalidateQueries({ queryKey: ["item", itemId] });
      } catch (error) {
        console.error("Autosave failed:", error);
        toast.error("Save failed");
      }
    }
  };

  // De robuuste retry handler
  const handleRetryFailed = async (e) => {
    e.preventDefault();
    
    // 1. Bepaal project context
    // Prioriteit: Prop -> LocalStorage -> null (Global)
    let targetProjectId = projectId;
    if (!targetProjectId) {
        targetProjectId = localStorage.getItem("lastSelectedProjectId");
    }
    // Cleanup string "null"
    if (targetProjectId === "null") targetProjectId = null;

    const failedTasks = taskChecks.filter((c) => c.status === "failed");
    if (failedTasks.length === 0) return;

    setIsRetrying(true);
    try {
      const createdIds = [];

      // 2. Maak thoughts aan (Parallel voor snelheid)
      const promises = failedTasks.map(task => {
        return base44.entities.Thought.create({
          content: task.full_description || task.task_name,
          project_id: targetProjectId,
          is_selected: true,
          is_deleted: false,
          retry_from_item_id: itemId,
          focus_type: "both"
        });
      });

      const results = await Promise.all(promises);
      results.forEach(t => createdIds.push(t.id));

      // 3. Update checklist status naar "retried"
      const updatedChecks = taskChecks.map(c => 
        c.status === "failed" ? { ...c, status: "retried", is_checked: false } : c
      );
      onTaskChecksChange(updatedChecks);
      
      if (itemId) {
        await base44.entities.Item.update(itemId, { task_checks: updatedChecks });
        queryClient.invalidateQueries({ queryKey: ["item", itemId] });
      }

      // 4. Invalideer thoughts cache zodat ze zichtbaar worden
      await queryClient.resetQueries({ queryKey: ['thoughts'] });

      // 5. Update LocalStorage & Event voor instant sync in andere tabs
      if (targetProjectId) {
        localStorage.setItem("lastSelectedProjectId", targetProjectId);
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'lastSelectedProjectId',
            newValue: targetProjectId
        }));
      }

      toast.success(`${createdIds.length} tasks sent to Multiprompt`);

      // 6. Navigeer met state
      navigate(createPageUrl("Multiprompt"), {
        state: {
          projectId: targetProjectId,
          retryThoughtIds: createdIds
        }
      });

    } catch (error) {
      console.error("Retry error:", error);
      toast.error("Retry failed");
    } finally {
      setIsRetrying(false);
    }
  };

  // Counters
  const successCount = taskChecks.filter((c) => c.status === "success").length;
  const failedCount = taskChecks.filter((c) => c.status === "failed").length;
  const retriedCount = taskChecks.filter((c) => c.status === "retried").length;
  const openCount = taskChecks.length - successCount - failedCount - retriedCount;

  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-indigo-800">
            <ListChecks className="w-5 h-5" />
            Task Checklist
            <Badge variant="outline" className="ml-2 text-xs">
              {successCount}/{taskChecks.length} done
            </Badge>
          </CardTitle>

          {failedCount > 0 && !readOnly && (
            <Button
              type="button"
              onClick={handleRetryFailed}
              disabled={isRetrying}
              size="sm"
              className="bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
            >
              {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Retry {failedCount} failed
            </Button>
          )}
        </div>
        <div className="flex gap-3 mt-2 text-xs">
          <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {successCount}</span>
          <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3"/> {failedCount}</span>
          <span className="text-indigo-600 flex items-center gap-1"><RotateCcw className="w-3 h-3"/> {retriedCount}</span>
          <span className="text-blue-600 flex items-center gap-1"><Circle className="w-3 h-3"/> {openCount}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <TooltipProvider>
          {taskChecks.map((check, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border bg-white flex items-center justify-between gap-3 transition-all ${
                check.status === "success" ? "border-green-300 opacity-75" :
                check.status === "failed" ? "border-red-300 bg-red-50/50" :
                check.status === "retried" ? "border-indigo-300 bg-indigo-50/50" :
                "border-slate-200"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${check.status === "success" ? "line-through text-green-700" : "text-slate-800"}`}>
                  {check.task_name}
                </p>
                {check.status === "retried" && (
                  <span className="text-[10px] text-indigo-600 font-medium block mt-0.5">Sent back to Multiprompt</span>
                )}
              </div>

              {!readOnly && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={(e) => handleStatusChange(e, index, "open")} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400" title="Open"><Circle className="w-4 h-4"/></button>
                  <button onClick={(e) => handleStatusChange(e, index, "success")} className="p-1.5 hover:bg-green-100 rounded-full text-green-600" title="Success"><CheckCircle2 className="w-4 h-4"/></button>
                  <button onClick={(e) => handleStatusChange(e, index, "failed")} className="p-1.5 hover:bg-red-100 rounded-full text-red-600" title="Failed"><XCircle className="w-4 h-4"/></button>
                </div>
              )}
            </div>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}