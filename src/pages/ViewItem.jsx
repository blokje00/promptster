import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Edit, Copy, CheckCircle, Star, MessageSquare, Image as ImageIcon, ZoomIn, FileArchive, Download, GitBranch, Calendar, ClipboardCheck, ClipboardPaste, Save, Loader2, ListChecks, AlertCircle, RotateCcw, CheckCircle2, XCircle, Circle } from "lucide-react";
import FileChangesFeedback from "../components/items/FileChangesFeedback";
import ScreenshotThumb from "../components/media/ScreenshotThumb";
import PromptFeedbackDialog from "../components/vault/PromptFeedbackDialog";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function ViewItem() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(location.search);
  const itemId = urlParams.get("id");
  const [copied, setCopied] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => base44.entities.Item.get(itemId),
    enabled: !!itemId,
  });

  const updateItemMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.update(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }
  });

  const handleCopy = () => {
    if (!item?.content) return;
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    toast.success('Content copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasteFeedbackDirect = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setIsSavingFeedback(true);
        // Append to existing feedback or set new
        const newFeedback = item.file_changes_feedback 
          ? `${item.file_changes_feedback}\n\n---\n\n${text}` 
          : text;
        await updateItemMutation.mutateAsync({
          file_changes_feedback: newFeedback
        });
        toast.success('Feedback pasted and saved!');
        setIsSavingFeedback(false);
      }
    } catch (err) {
      toast.error('Could not paste from clipboard');
      setIsSavingFeedback(false);
    }
  };

  const handlePasteFeedback = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFeedbackText(text);
        toast.success('Feedback pasted from clipboard');
      }
    } catch (err) {
      toast.error('Could not paste from clipboard');
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSavingFeedback(true);
    try {
      await updateItemMutation.mutateAsync({
        file_changes_feedback: feedbackText,
        is_pending_check: false
      });
      toast.success('Feedback saved and check completed!');
      setFeedbackText("");
    } catch (err) {
      toast.error('Could not save feedback');
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleMarkAsChecked = async () => {
    try {
      await updateItemMutation.mutateAsync({ is_pending_check: false });
      toast.success('Check completed!');
    } catch (err) {
      toast.error('Could not change status');
    }
  };

  const handleRetryFailed = async () => {
    if (!item?.task_checks) return;
    
    const failedTasks = item.task_checks.filter(check => check.status === 'failed');
    
    if (failedTasks.length === 0) {
      toast.info("No failed tasks to retry.");
      return;
    }

    setIsRetrying(true);
    try {
      // Create thoughts for each failed task
      const promises = failedTasks.map(task => {
        return base44.entities.Thought.create({
          content: task.full_description || task.task_name,
          project_id: item.project_id,
          is_selected: true,
          retry_from_item_id: item.id,
          focus_type: 'both', // Default focus
        });
      });

      await Promise.all(promises);
      
      toast.success(`${failedTasks.length} tasks restored!`);
      // Redirect to multiprompt
      setTimeout(() => {
        navigate(createPageUrl("Multiprompt"));
      }, 1000);
    } catch (error) {
      console.error("Retry error:", error);
      toast.error("Could not restore tasks");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleStatusChange = (taskIndex, newStatus) => {
    const newChecks = [...item.task_checks];
    newChecks[taskIndex] = { 
      ...newChecks[taskIndex], 
      status: newStatus,
      is_checked: newStatus === 'success' // Keep sync for backward compat if needed
    };
    updateItemMutation.mutate({ task_checks: newChecks });
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-6 w-3/4 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center p-16">
        <h2 className="text-2xl font-bold">Item not found</h2>
        <p className="text-slate-500 mt-2">The item you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-6">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

      <PromptFeedbackDialog
        open={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
        item={item}
        promptUsed={item?.content || ""}
        projectId={item?.project_id}
        usedTemplates={[item?.start_template_id, item?.end_template_id].filter(Boolean)}
      />
    </AccessGuard>
  );
}