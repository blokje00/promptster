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
 * TaskChecklist component voor weergave en beheer van task_checks in een item.
 * Toont elke taak met status knoppen (Open/Goed/Fout) en een retry-knop voor mislukte taken.
 * Autosaves status changes directly to the database.
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
  const [isSaving, setIsSaving] = useState(false);

  if (!taskChecks || taskChecks.length === 0) {
    return null;
  }

  /**
   * Handles status change with autosave to database.
   * Updates UI immediately, then persists to DB.
   */
  const handleStatusChange = async (e, index, newStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly || isSaving) return;
    
    const newChecks = [...taskChecks];
    newChecks[index] = {
      ...newChecks[index],
      status: newStatus,
      is_checked: newStatus === 'success'
    };
    
    // Update UI immediately
    onTaskChecksChange(newChecks);
    
    // Autosave to database
    if (itemId) {
      setIsSaving(true);
      try {
        await base44.entities.Item.update(itemId, { task_checks: newChecks });
        // Invalidate queries to keep data in sync
        queryClient.invalidateQueries({ queryKey: ['item', itemId] });
      } catch (error) {
        console.error("Autosave failed:", error);
        toast.error("Could not save status change");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRetryFailed = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const failedTasks = taskChecks.filter(check => check.status === 'failed');
    
    if (failedTasks.length === 0) {
      toast.info("No failed tasks to retry.");
      return;
    }

    setIsRetrying(true);
    try {
      // Create thoughts for each failed task - one by one to ensure all are created
      const createdThoughts = [];
      for (const task of failedTasks) {
        const newThought = await base44.entities.Thought.create({
          content: task.full_description || task.task_name,
          project_id: projectId || null,
          is_selected: true,
          is_deleted: false,
          retry_from_item_id: itemId,
          focus_type: 'both',
        });
        createdThoughts.push(newThought);
      }
      
      // Invalidate thoughts query so Multiprompt sees the new tasks
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      
      // If project selected, also invalidate project-specific queries
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['thoughts', projectId] });
      }
      
      toast.success(`${failedTasks.length} tasks sent back to Multiprompt!`);
      
      // Navigate to Multiprompt with the project pre-selected if available
      const targetUrl = projectId 
        ? createPageUrl("Multiprompt") 
        : createPageUrl("Multiprompt");
      
      setTimeout(() => {
        navigate(targetUrl);
      }, 800);
    } catch (error) {
      console.error("Retry error:", error);
      toast.error("Could not restore tasks");
      setIsRetrying(false);
    }
  };

  const successCount = taskChecks.filter(c => c.status === 'success').length;
  const failedCount = taskChecks.filter(c => c.status === 'failed').length;
  const openCount = taskChecks.filter(c => !c.status || c.status === 'open').length;

  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-indigo-800">
            <ListChecks className="w-5 h-5" />
            Task Checklist
            <Badge variant="outline" className="ml-2 text-xs">
              {successCount}/{taskChecks.length} completed
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
              {isRetrying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Retry {failedCount} failed tasks
            </Button>
          )}
        </div>
        
        {/* Status summary */}
        <div className="flex gap-3 mt-2 text-xs">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-3 h-3" /> {successCount} success
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="w-3 h-3" /> {failedCount} failed
          </span>
          <span className="flex items-center gap-1 text-blue-600">
            <Circle className="w-3 h-3" /> {openCount} open
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <TooltipProvider>
        {taskChecks.map((check, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <div 
                className={`p-3 rounded-lg border bg-white flex items-center justify-between gap-3 cursor-pointer hover:shadow-sm transition-shadow ${
                  check.status === 'success' ? 'border-green-300' :
                  check.status === 'failed' ? 'border-red-300' :
                  'border-slate-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    check.status === 'success' ? 'text-green-700 line-through' : 
                    check.status === 'failed' ? 'text-red-700 font-medium' : 
                    'text-slate-700'
                  }`}>
                    {check.task_name}
                  </p>
                  {check.status === 'failed' && (
                    <span className="inline-flex items-center text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-1">
                      Will be included in retry
                    </span>
                  )}
                </div>
            
            {!readOnly && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleStatusChange(e, index, 'open')}
                  className={`p-1.5 rounded-full transition-colors ${
                    (!check.status || check.status === 'open') 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'text-slate-300 hover:bg-slate-100'
                  }`}
                  title="Open"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleStatusChange(e, index, 'success')}
                  className={`p-1.5 rounded-full transition-colors ${
                    check.status === 'success' 
                      ? 'bg-green-100 text-green-600' 
                      : 'text-slate-300 hover:bg-slate-100'
                  }`}
                  title="Success"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleStatusChange(e, index, 'failed')}
                  className={`p-1.5 rounded-full transition-colors ${
                    check.status === 'failed' 
                      ? 'bg-red-100 text-red-600' 
                      : 'text-slate-300 hover:bg-slate-100'
                  }`}
                  title="Failed"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-2xl max-h-96 overflow-auto p-4 bg-slate-900 text-white">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{check.full_description || check.task_name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}