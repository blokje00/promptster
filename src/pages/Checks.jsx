import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, RotateCcw, Loader2, XCircle, ArrowUpDown, Search, Filter, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * CollapsibleTaskContent - Shows 5 lines max, expandable dropdown
 */
function CollapsibleTaskContent({ taskName, fullDescription, status }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const content = fullDescription || taskName;
  const lines = content.split('\n');
  const needsCollapse = lines.length > 5;
  const displayContent = needsCollapse && !isExpanded 
    ? lines.slice(0, 5).join('\n') 
    : content;

  const statusClasses = 
    status === 'success' ? 'text-slate-400 dark:text-slate-500 line-through' : 
    'text-slate-900 dark:text-slate-100';

  return (
    <div className="space-y-2">
      <p className={`font-medium leading-relaxed whitespace-pre-wrap ${statusClasses}`}>
        {displayContent}
      </p>
      {needsCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show more ({lines.length - 5} more lines)
            </>
          )}
        </button>
      )}
    </div>
  );
}
import { format } from "date-fns";

import { toast } from "sonner";
import { projectColors } from "@/components/lib/constants";
import RetryModal from "@/components/checks/RetryModal";



export default function Checks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [sortConfig, setSortConfig] = useState({ key: "updated_date", direction: "asc" });
  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [selectedRetryTask, setSelectedRetryTask] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Item.filter({ created_by: currentUser.email }, "-updated_date");
    },
    enabled: !!currentUser?.email,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => currentUser ? await base44.entities.Project.filter({ created_by: currentUser.email }) : [],
    enabled: !!currentUser
  });

  // Flatten tasks with proper screenshot handling
  const allTasks = useMemo(() => {
    const tasks = [];
    items.forEach(item => {
      if (item.task_checks && Array.isArray(item.task_checks)) {
        item.task_checks.forEach((check, index) => {
          tasks.push({
            id: `${item.id}-${index}`,
            itemId: item.id,
            itemTitle: item.title,
            projectId: item.project_id,
            index: index,
            taskNumber: `TASK-${index + 1}`,
            // Only include screenshots that belong to THIS specific check
            // If check has its own screenshots, use those
            // Otherwise, fall back to item screenshots ONLY if this is the first task
            screenshot_ids: check.screenshot_ids || (index === 0 ? (item.screenshot_ids || []) : []),
            ...check,
            updated_date: check.updated_date || item.updated_date,
            created_date: check.created_date || item.created_date
          });
        });
      }
    });
    return tasks;
  }, [items]);

  // Filter and Sort
  const filteredTasks = useMemo(() => {
    let result = [...allTasks];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(task => 
        (task.task_name && task.task_name.toLowerCase().includes(lowerQuery)) ||
        (task.full_description && task.full_description.toLowerCase().includes(lowerQuery)) ||
        (task.itemTitle && task.itemTitle.toLowerCase().includes(lowerQuery))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(task => {
        // Handle 'open' default status if status is undefined/null
        const status = task.status || "open";
        return status === statusFilter;
      });
    }

    // No sorting - keep insertion order (chronological)
    return result;
  }, [allTasks, searchQuery, statusFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async ({ itemId, taskIndex }) => {
      const item = items.find(i => i.id === itemId);
      if (!item) throw new Error("Item not found");
      
      const newChecks = item.task_checks.filter((_, idx) => idx !== taskIndex);
      
      // If no tasks left, delete the entire item
      if (newChecks.length === 0) {
        await base44.entities.Item.delete(itemId);
        return { deleted: true };
      }
      
      // Otherwise just remove this check
      await base44.entities.Item.update(itemId, { task_checks: newChecks });
      return { deleted: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['openTasksCount'] });
      toast.success(result.deleted ? "Item deleted (no tasks left)" : "Task deleted");
    },
    onError: () => {
      toast.error("Failed to delete task");
    }
  });

  const updateTaskStatus = async (task, newStatus) => {
    const item = items.find(i => i.id === task.itemId);
    if (!item) return;

    // If retry is triggered, open modal instead
    if (newStatus === 'retry') {
      setSelectedRetryTask(task);
      setRetryModalOpen(true);
      return;
    }

    const newChecks = [...item.task_checks];
    const now = new Date().toISOString();
    
    newChecks[task.index] = {
      ...newChecks[task.index],
      status: newStatus,
      is_checked: newStatus === 'success',
      updated_date: now
    };

    // Ensure created_date is set if missing
    if (!newChecks[task.index].created_date) {
      newChecks[task.index].created_date = item.created_date; 
    }

    // Calculate parent item status
    const parentStatus = newChecks.some(c => c.status !== 'success') ? 'open' : 'success';

    try {
      await base44.entities.Item.update(item.id, {
        task_checks: newChecks,
        status: parentStatus
      });

      if (newStatus === 'success') {
        toast.success("Task marked as success");
      } else {
        toast.success(`Task updated to ${newStatus}`);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['openTasksCount'] });
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleRetryConfirm = async (retryData) => {
    if (!selectedRetryTask) return;

    const task = selectedRetryTask;
    const item = items.find(i => i.id === task.itemId);
    if (!item) {
      toast.error("Item not found");
      setRetryModalOpen(false);
      return;
    }

    let newThought = null;
    try {
      // Create new Thought with retry reference and user ownership
      newThought = await base44.entities.Thought.create({
        content: retryData.content,
        screenshot_ids: retryData.screenshots,
        project_id: task.projectId || null,
        is_selected: true,
        is_deleted: false,
        retry_from_item_id: task.itemId,
        focus_type: 'both',
        created_by: currentUser.email,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        vision_analysis: retryData.screenshots && retryData.screenshots.length > 0 ? { status: 'pending', results: [] } : undefined
      });

      // Remove task from item's task_checks array
      const newChecks = item.task_checks.filter((_, idx) => idx !== task.index);

      // Optimistic UI update - remove task from list
      queryClient.setQueryData(['items', currentUser?.email], (oldData) => {
        if (!oldData) return oldData;
        
        // If no tasks left, remove entire item
        if (newChecks.length === 0) {
          return oldData.filter(i => i.id !== item.id);
        }
        
        // Otherwise update with filtered tasks
        return oldData.map((i) =>
          i.id === item.id ? { ...i, task_checks: newChecks } : i
        );
      });

      // Update or delete item based on remaining tasks
      if (newChecks.length === 0) {
        await base44.entities.Item.delete(item.id);
      } else {
        await base44.entities.Item.update(item.id, { task_checks: newChecks });
      }

      setRetryModalOpen(false);
      setSelectedRetryTask(null);

      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['activeThoughts'] });
      queryClient.invalidateQueries({ queryKey: ['allThoughtsCount'] });
      queryClient.invalidateQueries({ queryKey: ['openTasksCount'] });

      toast.success("✓ Retry task created and original removed! Check Multiprompt page.");
    } catch (error) {
      console.error("Retry failed:", error);
      
      // Rollback: delete the created Thought if item update failed
      if (newThought?.id) {
        try {
          await base44.entities.Thought.delete(newThought.id);
        } catch (deleteError) {
          console.error("Failed to rollback Thought creation:", deleteError);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.error("Failed to complete retry - changes rolled back");
    }
  };



  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Checks
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Review and manage all your pending tasks</p>
          </div>



          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 w-full md:w-auto flex-1">
              <div className="relative flex-1 md:max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input 
                  placeholder="Search tasks..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
               <div className="text-sm text-slate-500 dark:text-slate-400">
                 {filteredTasks.length} tasks found
               </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                 <tr>
                   <th className="px-6 py-3">
                     Task
                   </th>
                   <th className="px-6 py-3 w-[160px]">
                     Project
                   </th>
                   <th className="px-6 py-3 w-[140px]">
                     Updated
                   </th>
                   <th className="px-6 py-3 w-[180px] text-right">Actions</th>
                 </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        No tasks found
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (<tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                        <td className="px-6 py-4 align-top max-w-md">
                          <div className="flex flex-col gap-2">
                            <Badge variant="outline" className="w-fit text-xs font-mono">
                              {task.taskNumber}
                            </Badge>
                            <CollapsibleTaskContent 
                              taskName={task.task_name}
                              fullDescription={task.full_description}
                              status={task.status}
                            />
                            {task.screenshot_ids && task.screenshot_ids.length > 0 && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {task.screenshot_ids.map((url, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => window.open(url, '_blank')}
                                    className="relative group"
                                  >
                                    <img 
                                      src={url} 
                                      alt={`Screenshot ${idx + 1}`}
                                      className="w-20 h-20 object-cover rounded border border-slate-200 hover:scale-150 hover:z-50 transition-transform cursor-pointer"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                         </td>
                        <td className="px-6 py-4 align-top">
                          {project ? (
                            <Badge className={`${projectColors[project.color]} text-white text-xs`}>
                              {project.name}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs">No project</span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top text-slate-500 dark:text-slate-400">
                          {task.updated_date ? format(new Date(task.updated_date), 'dd-MM-yyyy HH:mm') : '-'}
                        </td>
                        <td className="px-6 py-4 align-top text-right">
                         <div className="flex items-center justify-end gap-2">
                           {task.status === 'success' ? (
                               <TooltipProvider>
                                   <Tooltip>
                                       <TooltipTrigger asChild>
                                           <div 
                                             onClick={() => updateTaskStatus(task, 'open')} 
                                             className="cursor-pointer hover:scale-110 transition-transform shrink-0"
                                           >
                                               <CheckCircle2 className="w-8 h-8 text-green-600 drop-shadow-sm" strokeWidth={2.5} />
                                           </div>
                                           </TooltipTrigger>
                                           <TooltipContent>Click to reopen</TooltipContent>
                                           </Tooltip>
                                               </TooltipProvider>
                                           ) : (
                               <>
                                   <TooltipProvider>
                                       <Tooltip>
                                           <TooltipTrigger asChild>
                                               <Button 
                                                   size="icon" 
                                                   variant="ghost" 
                                                   className={`h-8 w-8 ${task.status === 'success' ? 'text-green-600' : 'text-slate-300 hover:text-green-600 hover:bg-green-50'}`}
                                                   onClick={() => updateTaskStatus(task, 'success')}
                                               >
                                                   <CheckCircle2 className="w-6 h-6" />
                                               </Button>
                                           </TooltipTrigger>
                                           <TooltipContent>Mark as Success</TooltipContent>
                                       </Tooltip>
                                       <Tooltip>
                                           <TooltipTrigger asChild>
                                               <Button 
                                                   size="icon" 
                                                   variant="ghost" 
                                                   className="h-8 w-8 text-slate-300 hover:text-orange-600 hover:bg-orange-50"
                                                   onClick={() => updateTaskStatus(task, 'retry')}
                                               >
                                                   <RotateCcw className="w-6 h-6" />
                                               </Button>
                                           </TooltipTrigger>
                                           <TooltipContent>Retry</TooltipContent>
                                       </Tooltip>
                                       <Tooltip>
                                           <TooltipTrigger asChild>
                                               <Button 
                                                   size="icon" 
                                                   variant="ghost" 
                                                   className="h-8 w-8 text-slate-300 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-300"
                                                   onClick={() => deleteTaskMutation.mutate({ itemId: task.itemId, taskIndex: task.index })}
                                               >
                                                   <Trash2 className="w-5 h-5" />
                                               </Button>
                                           </TooltipTrigger>
                                           <TooltipContent>Delete Task</TooltipContent>
                                       </Tooltip>
                                   </TooltipProvider>
                               </>
                           )}
                         </div>
                        </td>
                      </tr>);
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Retry Modal */}
        <RetryModal
          isOpen={retryModalOpen}
          onClose={() => {
            setRetryModalOpen(false);
            setSelectedRetryTask(null);
          }}
          task={selectedRetryTask}
          onConfirm={handleRetryConfirm}
          projectId={selectedRetryTask?.projectId}
          currentUser={currentUser}
        />
      </div>
  );
}