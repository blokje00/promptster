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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RequireSubscription from "../components/auth/RequireSubscription";

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
    <RequireSubscription>
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {item.type === 'multiprompt' && (
              <Button
                variant="outline"
                onClick={handlePasteFeedbackDirect}
                disabled={isSavingFeedback}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                title="Plak tekst uit klembord direct als Project Kennis Feedback"
              >
                {isSavingFeedback ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ClipboardPaste className="w-4 h-4 mr-2" />
                )}
                Paste PKF
              </Button>
            )}
            <Link to={createPageUrl(`EditItem?id=${itemId}`)}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-slate-900">{item.title}</CardTitle>
                {item.description && (
                  <CardDescription className="mt-2 text-lg">{item.description}</CardDescription>
                )}
              </div>
              {item.is_favorite && (
                <Badge variant="outline" className="bg-yellow-100 border-yellow-300 text-yellow-700">
                  <Star className="w-4 h-4 mr-2 fill-yellow-500" />
                  Favorite
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-4">
              <Badge variant="secondary">{item.type}</Badge>
              {item.language && <Badge variant="secondary">{item.language}</Badge>}
              {item.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {item.is_publish_version && (
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                  <GitBranch className="w-5 h-5" />
                  Publish Version
                </h4>
                {item.publish_timestamp && (
                  <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(item.publish_timestamp).toLocaleString('en-US')}</span>
                  </div>
                )}
                {item.publish_working_notes && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">What worked well:</p>
                    <p className="text-sm text-green-700 whitespace-pre-wrap">{item.publish_working_notes}</p>
                  </div>
                )}
                {item.publish_reason && (
                  <div>
                    <p className="text-xs font-semibold text-green-800 mb-1">Reason for Publish:</p>
                    <p className="text-sm text-green-700 whitespace-pre-wrap">{item.publish_reason}</p>
                  </div>
                )}
              </div>
            )}

            {item.notes && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Notes
                </h4>
                <div className="text-sm text-blue-700 whitespace-pre-wrap max-h-[240px] overflow-auto">
                  {item.notes}
                </div>
              </div>
            )}

            {item.images && item.images.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4" />
                  Screenshots & Images ({item.images.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {item.images.map((imageUrl, index) => (
                    <Dialog key={index}>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer group relative overflow-hidden rounded-lg border-2 border-slate-200 hover:border-indigo-500 transition-all">
                          <img
                            src={imageUrl}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-2 left-2 bg-slate-900 text-white text-xs font-medium px-2 py-1 rounded">
                            #{index + 1}
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
                        <div className="relative">
                          <img
                            src={imageUrl}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-auto rounded-lg"
                          />
                          <div className="mt-4 text-center text-sm text-slate-500">
                            Image {index + 1} of {item.images.length}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            )}

            {item.zip_files && item.zip_files.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <FileArchive className="w-4 h-4" />
                  ZIP Files ({item.zip_files.length})
                </h4>
                <div className="space-y-2">
                  {item.zip_files.map((zipFile, index) => (
                    <Card key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileArchive className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{zipFile.name}</p>
                          <p className="text-xs text-slate-500">ZIP file</p>
                        </div>
                      </div>
                      <a 
                        href={zipFile.url} 
                        download={zipFile.name}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </a>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Pending Check Section - Feedback Input */}
            {item.type === 'multiprompt' && item.is_pending_check && (
              <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-1">
                      <ClipboardCheck className="w-5 h-5" />
                      Check & Feedback
                    </h4>
                    <p className="text-sm text-orange-700">
                      Go through the checklist and paste the feedback (changed files).
                    </p>
                  </div>
                  
                  {item.task_checks?.some(c => c.status === 'failed') && (
                    <Button 
                      onClick={handleRetryFailed} 
                      disabled={isRetrying}
                      className="bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 shadow-sm"
                    >
                      {isRetrying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                      Retry Failed Tasks
                    </Button>
                  )}
                </div>

                {/* Interactive Checklist with Tooltips */}
                {item.task_checks && item.task_checks.length > 0 && (
                  <div className="mb-6 bg-white rounded-md border border-orange-200 overflow-hidden">
                    <div className="px-4 py-2 bg-orange-100/50 border-b border-orange-200 font-medium text-sm text-orange-800 flex items-center justify-between">
                      <span>Checklist ({item.task_checks.filter(c => c.status === 'success').length}/{item.task_checks.length} completed)</span>
                      <ListChecks className="w-4 h-4" />
                    </div>
                    <TooltipProvider>
                      <div className="divide-y divide-slate-100">
                        {item.task_checks.map((check, index) => (
                          <Tooltip key={index}>
                            <TooltipTrigger asChild>
                              <div className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${check.status === 'success' ? 'text-green-700 line-through font-medium' : check.status === 'failed' ? 'text-red-700 font-medium' : 'text-slate-700'}`}>
                                    {check.task_name}
                                  </p>
                                  {check.status === 'failed' && (
                                    <span className="inline-flex items-center text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-1">
                                      Will be included in retry
                                    </span>
                                  )}
                                </div>
                                
                                {/* Task 9: Checkboxes instead of Dropdown */}
                                <div className="flex items-center gap-1 ml-2 shrink-0">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(index, 'success');
                                        }}
                                        className={`p-1.5 rounded-md border transition-all ${
                                          check.status === 'success' 
                                            ? 'bg-green-500 text-white border-green-600' 
                                            : 'bg-white text-slate-300 border-slate-200 hover:border-green-400 hover:text-green-500'
                                        }`}
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Mark as Success</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(index, 'failed');
                                        }}
                                        className={`p-1.5 rounded-md border transition-all ${
                                          check.status === 'failed' 
                                            ? 'bg-red-500 text-white border-red-600' 
                                            : 'bg-white text-slate-300 border-slate-200 hover:border-red-400 hover:text-red-500'
                                        }`}
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Mark as Failed</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(index, 'open');
                                        }}
                                        className={`p-1.5 rounded-md border transition-all ${
                                          check.status === 'open' || !check.status
                                            ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                            : 'bg-white text-slate-300 border-slate-200 hover:bg-slate-50'
                                        }`}
                                      >
                                        <Circle className="w-4 h-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reset to Open</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </TooltipTrigger>
                            {/* Task 8: Fix Tooltip Visibility (collisionPadding + z-index) */}
                            <TooltipContent 
                              side="top" 
                              align="start"
                              collisionPadding={20}
                              className="z-50 max-w-[90vw] md:max-w-2xl max-h-[60vh] overflow-auto p-4 bg-slate-900 text-white shadow-xl"
                            >
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{check.full_description || check.task_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePasteFeedback}
                      className="border-orange-400 text-orange-700 hover:bg-orange-100"
                    >
                      <ClipboardPaste className="w-4 h-4 mr-2" />
                      Paste from clipboard
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Or paste the feedback text here directly..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="min-h-[120px] bg-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveFeedback}
                      disabled={!feedbackText.trim() || isSavingFeedback}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {isSavingFeedback ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Feedback & Complete
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleMarkAsChecked}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete only
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Project Knowledge Feedback Section - Show saved feedback */}
            {item.type === 'multiprompt' && item.file_changes_feedback && (
              <FileChangesFeedback
                value={item.file_changes_feedback}
                readOnly={true}
              />
            )}

            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Content</h4>
              <div className="relative">
                <div className="bg-slate-900 rounded-xl p-4 max-h-[600px] overflow-auto">
                  <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all">
                    {item.content}
                  </pre>
                </div>
                <Button
                  onClick={handleCopy}
                  size="sm"
                  className="absolute top-3 right-3 bg-slate-700 hover:bg-slate-600"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </RequireSubscription>
  );
}