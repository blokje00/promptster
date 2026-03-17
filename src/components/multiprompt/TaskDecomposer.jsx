import React, { useState } from "react";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { Loader2, Split, Plus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
/**
 * Multi-Agent Task Decomposition - TIER 2 Feature #6
 * Splitst complexe tasks in subtaken met AI
 */
export default function TaskDecomposer({ open, onClose, thought, currentUser }) {
  const [subtasks, setSubtasks] = useState([]);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [selectedSubtasks, setSelectedSubtasks] = useState(new Set());
  const queryClient = useQueryClient();

  const createSubtasksMutation = useMutation({
    mutationFn: async (tasks) => {
      const promises = tasks.map(task => 
        base44.entities.Thought.create({
          content: `${task.title}\n\n${task.description}`,
          project_id: thought.project_id || "",
          is_selected: true,
          focus_type: task.focus_type || 'both',
          target_page: task.target_page,
          target_component: task.target_component,
          target_domain: task.target_domain
        })
      );
      return await Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast.success(`✅ Created ${data.length} subtasks`);
      onClose();
    }
  });

  const handleDecompose = async () => {
    setIsDecomposing(true);
    try {
      const decomposePrompt = `You are a task planning expert. Decompose this complex task into 3-5 specific, actionable subtasks.

COMPLEX TASK:
${thought.content}

${thought.target_page ? `TARGET PAGE: ${thought.target_page}` : ''}
${thought.target_component ? `TARGET COMPONENT: ${thought.target_component}` : ''}

OUTPUT FORMAT (strict JSON):
{
  "subtasks": [
    {
      "title": "Concise subtask title (max 10 words)",
      "description": "Detailed description of what needs to be done",
      "priority": "high|medium|low",
      "focus_type": "both|design|logic|no_design|discuss",
      "target_page": "PageName or null",
      "target_component": "ComponentName or null",
      "target_domain": "UI|Data|UploadFlow|etc or null",
      "estimated_complexity": "simple|moderate|complex"
    }
  ]
}

RULES:
- Break down into 3-5 logical subtasks
- Each subtask should be independently executable
- Order subtasks by dependency (first tasks should be foundational)
- Be specific about what needs to be changed/added
- Return ONLY valid JSON`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: decomposePrompt
      });

      let cleanResult = response.trim();
      cleanResult = cleanResult.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      
      const parsed = JSON.parse(cleanResult);
      
      if (parsed.subtasks && Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0) {
        setSubtasks(parsed.subtasks);
        // Auto-select all subtasks
        setSelectedSubtasks(new Set(parsed.subtasks.map((_, idx) => idx)));
        toast.success(`✨ Generated ${parsed.subtasks.length} subtasks`);
      } else {
        throw new Error("Invalid subtasks format");
      }
    } catch (error) {
      console.error("Decomposition error:", error);
      toast.error("Failed to decompose task");
    } finally {
      setIsDecomposing(false);
    }
  };

  const handleToggleSubtask = (index) => {
    const newSelected = new Set(selectedSubtasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSubtasks(newSelected);
  };

  const handleCreateSelected = async () => {
    const tasksToCreate = subtasks.filter((_, idx) => selectedSubtasks.has(idx));
    if (tasksToCreate.length === 0) {
      toast.error("Select at least one subtask");
      return;
    }
    
    await createSubtasksMutation.mutateAsync(tasksToCreate);
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return "bg-red-100 text-red-700";
    if (priority === 'medium') return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const getComplexityColor = (complexity) => {
    if (complexity === 'complex') return "bg-purple-100 text-purple-700";
    if (complexity === 'moderate') return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="w-5 h-5 text-indigo-600" />
            Task Decomposition
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Break down "{thought?.content?.substring(0, 50)}..." into subtasks
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {subtasks.length === 0 ? (
            <div className="text-center py-8">
              <Button
                onClick={handleDecompose}
                disabled={isDecomposing}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isDecomposing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Task...
                  </>
                ) : (
                  <>
                    <Split className="w-4 h-4 mr-2" />
                    Decompose Task
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Select which subtasks to create ({selectedSubtasks.size} selected)
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedSubtasks(
                    selectedSubtasks.size === subtasks.length 
                      ? new Set() 
                      : new Set(subtasks.map((_, i) => i))
                  )}
                >
                  {selectedSubtasks.size === subtasks.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="space-y-3">
                {subtasks.map((subtask, idx) => (
                  <Card 
                    key={idx}
                    className={`cursor-pointer transition-all ${
                      selectedSubtasks.has(idx) 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' 
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    onClick={() => handleToggleSubtask(idx)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {selectedSubtasks.has(idx) ? (
                            <CheckCircle className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">#{idx + 1}</span>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {subtask.title}
                            </h4>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {subtask.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={getPriorityColor(subtask.priority)}>
                              {subtask.priority}
                            </Badge>
                            <Badge className={getComplexityColor(subtask.estimated_complexity)}>
                              {subtask.estimated_complexity}
                            </Badge>
                            {subtask.target_page && (
                              <Badge variant="outline">
                                📄 {subtask.target_page}
                              </Badge>
                            )}
                            {subtask.target_component && (
                              <Badge variant="outline">
                                🧩 {subtask.target_component}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {subtasks.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSelected}
              disabled={createSubtasksMutation.isPending || selectedSubtasks.size === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createSubtasksMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create {selectedSubtasks.size} Subtasks
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}