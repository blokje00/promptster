import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { items, thoughts } from "@/api";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  RotateCcw,
  Loader2,
  XCircle,
} from "lucide-react";


import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ITEM_STATUS, TASK_CHECK_STATUS } from "@/components/lib/status";

/**
 * TaskChecklist - Rebuilt with robust retry logic
 */
export default function TaskChecklist({ 
  taskChecks = [], 
  onTaskChecksChange, 
  itemId, 
  projectId,
  readOnly = false 
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);

  // Calculate stats
  const completed = taskChecks.filter(t => t.status === TASK_CHECK_STATUS.SUCCESS).length;
  const failed = taskChecks.filter(t => t.status === TASK_CHECK_STATUS.FAILED).length;

  // Update single task status
  const handleStatusChange = (e, index, newStatus) => {
    e.stopPropagation();
    
    const updatedChecks = [...taskChecks];
    updatedChecks[index] = {
      ...updatedChecks[index],
      status: newStatus,
      is_checked: newStatus === TASK_CHECK_STATUS.SUCCESS
    };

    // Optimistic update parent
    onTaskChecksChange(updatedChecks);

    // Persist to DB immediately
    if (itemId) {
      // Task 1 & 4: Update parent Item status based on checklist
      const hasOpen = updatedChecks.some(c => c.status !== TASK_CHECK_STATUS.SUCCESS);
      const newStatus = hasOpen ? ITEM_STATUS.OPEN : ITEM_STATUS.SUCCESS;

      // Ensure we strip any properties not in schema if necessary, though the SDK handles it.
      items.update(itemId, {
        task_checks: updatedChecks,
        status: newStatus
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: items.keys.one(itemId) });
          // Invalidate openTasksCount for Header badge
          queryClient.invalidateQueries({ queryKey: ['openTasksCount'] });
        })
        .catch(() => {
          toast.error("Failed to update task status");
        });
    }
  };

  // Robust Retry Logic
  const handleRetryFailed = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const failedTasks = taskChecks.filter(check => check.status === TASK_CHECK_STATUS.FAILED);
    if (failedTasks.length === 0) return;

    setIsRetrying(true);

    try {
      // 1. Determine Project Context
      // Always try prop first, then localStorage fallback, then null (Global)
      let targetProjectId = projectId;
      if (!targetProjectId) {
        const stored = localStorage.getItem('lastSelectedProjectId');
        if (stored && stored !== "null") targetProjectId = stored;
      }

      // 2. Create new thoughts for retried tasks
      const newThoughts = await Promise.all(
        failedTasks.map(task =>
          thoughts.create({
            content: task.full_description || task.task_name,
            project_id: targetProjectId || null,
            is_selected: true,
            is_deleted: false,
            retry_from_item_id: itemId,
            focus_type: 'both'
          })
        )
      );

      // 3. Update local checklist status to 'retried'
      const updatedChecks = taskChecks.map(check =>
        check.status === TASK_CHECK_STATUS.FAILED
          ? { ...check, status: TASK_CHECK_STATUS.RETRIED, is_checked: false }
          : check
      );

      onTaskChecksChange(updatedChecks);

      if (itemId) {
        await items.update(itemId, { task_checks: updatedChecks });
        queryClient.invalidateQueries({ queryKey: items.keys.one(itemId) });
      }

      // 4. GLOBAL Invalidation to ensure Multiprompt (activeThoughts) sees new items
      thoughts.invalidateThoughtCaches(queryClient);

      // 5. Update Storage & Dispatch Event for Cross-Component Sync
      if (targetProjectId) {
        localStorage.setItem('lastSelectedProjectId', targetProjectId);
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'lastSelectedProjectId',
          newValue: targetProjectId
        }));
      }

      // 6. Navigate with precise state
      toast.success(`${newThoughts.length} tasks sent for retry`);
      
      navigate(createPageUrl("Multiprompt"), {
        state: {
          projectId: targetProjectId,
          retryThoughtIds: newThoughts.map(t => t.id)
        }
      });

    } catch (error) {
      console.error("Retry failed:", error);
      toast.error("Could not retry tasks");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-700 text-sm">Task Checklist</span>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
              {completed} Done
            </Badge>
            {failed > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                {failed} Failed
              </Badge>
            )}
          </div>
        </div>

        {!readOnly && failed > 0 && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleRetryFailed}
            disabled={isRetrying}
            className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            {isRetrying ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
            Retry Failed
          </Button>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {taskChecks.map((check, index) => (
          <div key={index} className="group flex items-start justify-between gap-4 p-4 hover:bg-slate-50 transition-colors">
            
            {/* Description - Full Text, No Tooltip */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                check.status === TASK_CHECK_STATUS.SUCCESS ? 'text-slate-400 line-through' :
                check.status === TASK_CHECK_STATUS.FAILED ? 'text-red-700 font-medium' :
                check.status === TASK_CHECK_STATUS.RETRIED ? 'text-indigo-600' :
                'text-slate-700'
              }`}>
                {check.full_description || check.task_name}
              </p>
              {check.status === TASK_CHECK_STATUS.FAILED && !readOnly && (
                  <span className="text-[10px] text-red-500 block mt-1">Marked for retry</span>
              )}
            </div>

            {/* Status Control - Horizontal Buttons at the end */}
            <div className="flex items-center gap-1 shrink-0 pt-0.5" onClick={e => e.stopPropagation()}>
                {readOnly ? (
                  // Read-only icon
                  check.status === TASK_CHECK_STATUS.SUCCESS ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                  check.status === TASK_CHECK_STATUS.FAILED ? <XCircle className="w-5 h-5 text-red-500" /> :
                  check.status === TASK_CHECK_STATUS.RETRIED ? <RotateCcw className="w-5 h-5 text-indigo-400" /> :
                  <Circle className="w-5 h-5 text-slate-300" />
                ) : (
                  // Interactive Horizontal Buttons
                  <>
                    <button
                      type="button" // Task 5: Prevent form submission
                      onClick={(e) => handleStatusChange(e, index, TASK_CHECK_STATUS.SUCCESS)}
                      className={`p-1.5 rounded-md border transition-all ${
                        check.status === TASK_CHECK_STATUS.SUCCESS
                          ? 'bg-green-500 text-white border-green-600'
                          : 'bg-white text-slate-300 border-slate-200 hover:border-green-400 hover:text-green-500'
                      }`}
                      title="Mark as Success"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button" // Task 5: Prevent form submission
                      onClick={(e) => handleStatusChange(e, index, TASK_CHECK_STATUS.FAILED)}
                      className={`p-1.5 rounded-md border transition-all ${
                        check.status === TASK_CHECK_STATUS.FAILED
                          ? 'bg-red-500 text-white border-red-600'
                          : 'bg-white text-slate-300 border-slate-200 hover:border-red-400 hover:text-red-500'
                      }`}
                      title="Mark as Failed"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button" // Task 5: Prevent form submission
                      onClick={(e) => handleStatusChange(e, index, TASK_CHECK_STATUS.OPEN)}
                      className={`p-1.5 rounded-md border transition-all ${
                        !check.status || check.status === TASK_CHECK_STATUS.OPEN || check.status === TASK_CHECK_STATUS.RETRIED
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-white text-slate-300 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="Reset to Open"
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                  </>
                )}
            </div>
          </div>
        ))}
        {taskChecks.length === 0 && (
          <div className="p-4 text-center text-sm text-slate-400 italic">
            No checklist tasks available.
          </div>
        )}
      </div>
    </div>
  );
}