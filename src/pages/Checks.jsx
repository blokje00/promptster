import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, RotateCcw, Loader2, XCircle, ArrowUpDown, Search, Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import RequireSubscription from "@/components/auth/RequireSubscription";
import { toast } from "sonner";
import ExportPanel from "@/components/export/ExportPanel";

export default function Checks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [sortConfig, setSortConfig] = useState({ key: "updated_date", direction: "desc" });
  const [isRetrying, setIsRetrying] = useState(false);

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

  // Flatten tasks
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
            ...check,
            // Use updated_date if available, otherwise item's updated_date as fallback
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

    result.sort((a, b) => {
      if (sortConfig.key === "updated_date") {
        const dateA = new Date(a.updated_date || 0);
        const dateB = new Date(b.updated_date || 0);
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }
      if (sortConfig.key === "status") {
        const statusA = a.status || "open";
        const statusB = b.status || "open";
        return sortConfig.direction === "asc" ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
      }
      if (sortConfig.key === "task_name") {
        const nameA = a.task_name || "";
        const nameB = b.task_name || "";
        return sortConfig.direction === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      return 0;
    });

    return result;
  }, [allTasks, searchQuery, statusFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  const updateTaskStatus = async (task, newStatus) => {
    const item = items.find(i => i.id === task.itemId);
    if (!item) return;

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
    const hasOpen = newChecks.some(c => !c.status || c.status === 'open' || c.status === 'retried'); // Treat retried as potentially needing attention or just distinct
    // Actually logic for parent status usually: if any failed -> failed, if all success -> success, else open
    // But keeping simple 'open' vs 'success' as per previous logic is fine
    const parentStatus = newChecks.some(c => c.status !== 'success') ? 'open' : 'success';

    try {
      await base44.entities.Item.update(item.id, {
        task_checks: newChecks,
        status: parentStatus
      });
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['openTasksCount'] });
      toast.success(`Task updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleRetry = async (task) => {
    setIsRetrying(true);
    try {
        // 1. Create Thought
        await base44.entities.Thought.create({
            content: `[Retry] ${task.full_description || task.task_name}`,
            project_id: task.projectId,
            is_selected: true,
            is_deleted: false,
            retry_from_item_id: task.itemId,
            focus_type: 'both'
        });

        // 2. Update task status to retried
        await updateTaskStatus(task, 'retried');

        // 3. Navigate
        // Need to set global project context if we want seamless flow
        if (task.projectId) {
            localStorage.setItem('lastSelectedProjectId', task.projectId);
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'lastSelectedProjectId',
                newValue: task.projectId
            }));
        }

        toast.success("Task sent to Multi-Task for retry");
        navigate(createPageUrl("Multiprompt"));

    } catch (error) {
        toast.error("Failed to retry task");
    } finally {
        setIsRetrying(false);
    }
  };

  return (
    <RequireSubscription>
      <div className="p-4 md:p-8 min-h-screen bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Checks
            </h1>
            <p className="text-slate-600 mt-1">Review and manage all your pending tasks</p>
          </div>

          {/* Export Section */}
          <div className="mb-6">
             <ExportPanel 
               items={items} 
               mode="vault" 
               showTypeFilter={false} 
               showCheckFilter={true}
               customTitle="Export This Prompt"
               className="shadow-sm border-orange-200" 
             />
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 w-full md:w-auto flex-1">
              <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="retried">Retried</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
               {/* Task 3: Global Retry Button */}
               {filteredTasks.some(t => t.status === 'failed') && (
                 <Button 
                   variant="outline" 
                   className="border-red-200 text-red-700 hover:bg-red-50"
                   onClick={async () => {
                     setIsRetrying(true);
                     const failedTasks = filteredTasks.filter(t => t.status === 'failed');
                     let successCount = 0;
                     
                     for (const task of failedTasks) {
                       try {
                         // 1. Create Thought
                         await base44.entities.Thought.create({
                             content: `[Retry] ${task.full_description || task.task_name}`,
                             project_id: task.projectId,
                             is_selected: true,
                             is_deleted: false,
                             retry_from_item_id: task.itemId,
                             focus_type: 'both'
                         });

                         // 2. Update task status
                         // Note: We duplicate update logic here to avoid refetch spam, or just refetch at end
                         // We'll assume updateTaskStatus is reused but modified to not invalidate every time if we batch?
                         // For simplicity, we'll just do it one by one but suppress toasts/invalidation for bulk?
                         // Actually, let's just do the DB update manually here
                         const item = items.find(i => i.id === task.itemId);
                         if (item) {
                             const newChecks = [...item.task_checks];
                             newChecks[task.index] = {
                               ...newChecks[task.index],
                               status: 'retried',
                               is_checked: false,
                               updated_date: new Date().toISOString()
                             };
                             await base44.entities.Item.update(item.id, { task_checks: newChecks });
                             successCount++;
                         }
                       } catch (e) {
                         console.error(e);
                       }
                     }
                     
                     setIsRetrying(false);
                     queryClient.invalidateQueries({ queryKey: ['items'] });
                     toast.success(`Retried ${successCount} tasks`);
                     
                     // Navigate to Multi-Task
                     if (successCount > 0) {
                        // Check if all tasks belong to same project? Use first one or last selected?
                        // Let's try to preserve the last used project context
                        navigate(createPageUrl("Multiprompt"));
                     }
                   }}
                   disabled={isRetrying}
                 >
                   {isRetrying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                   Retry {filteredTasks.filter(t => t.status === 'failed').length} Failed
                 </Button>
               )}
               <div className="text-sm text-slate-500">
                 {filteredTasks.length} tasks found
               </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('task_name')}>
                      <div className="flex items-center gap-2">
                        Task
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3 w-[140px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('updated_date')}>
                      <div className="flex items-center gap-2">
                        Updated
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3 w-[120px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                        No tasks found
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className={`font-medium leading-relaxed line-clamp-3 ${
                                    task.status === 'success' ? 'text-slate-400 line-through' : 
                                    task.status === 'retried' ? 'text-slate-400 line-through' : 
                                    'text-slate-900'
                                  }`}>
                                    {task.task_name}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-lg bg-slate-900 text-white p-3">
                                  <p className="whitespace-pre-wrap">{task.full_description || task.task_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-slate-500">
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
                                              className="cursor-pointer hover:scale-110 transition-transform"
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
                                                    className={`h-8 w-8 ${task.status === 'failed' ? 'text-red-600 bg-red-50' : 'text-slate-300 hover:text-red-600 hover:bg-red-50'}`}
                                                    onClick={() => updateTaskStatus(task, 'failed')}
                                                >
                                                    <XCircle className="w-6 h-6" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Mark as Failed</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </RequireSubscription>
  );
}