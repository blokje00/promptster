import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThumbsUp, ThumbsDown, Star, Meh, Sparkles, Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

const RATING_ICONS = {
  excellent: Star,
  good: ThumbsUp,
  okay: Meh,
  poor: ThumbsDown
};

const RATING_COLORS = {
  excellent: "text-green-600 bg-green-100",
  good: "text-blue-600 bg-blue-100",
  okay: "text-yellow-600 bg-yellow-100",
  poor: "text-red-600 bg-red-100"
};

/**
 * Toont feedback insights en stelt gebruiker in staat om learnings toe te passen (PROJECT-SPECIFIC)
 */
export default function FeedbackInsights({ currentUser }) {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = React.useState("all");

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['promptFeedback', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.PromptFeedback.filter({ 
        created_by: currentUser.email 
      });
    },
    enabled: Boolean(currentUser?.email)
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Project.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email
  });

  // Filter feedback by project
  const filteredFeedbacks = useMemo(() => {
    if (selectedProjectId === "all") return feedbacks;
    return feedbacks.filter(f => f.project_id === selectedProjectId);
  }, [feedbacks, selectedProjectId]);

  // Get unique projects with feedback
  const projectsWithFeedback = useMemo(() => {
    const projectIds = [...new Set(feedbacks.map(f => f.project_id).filter(Boolean))];
    return projects.filter(p => projectIds.includes(p.id));
  }, [feedbacks, projects]);

  const applyFeedbackMutation = useMutation({
    mutationFn: async (feedbackId) => {
      const response = await base44.functions.invoke('applyFeedbackToPreferences', {
        feedbackId
      });
      return response.data;
    },
    onSuccess: (data, feedbackId) => {
      if (data.skipped) {
        toast.info("This feedback was already applied");
      } else {
        toast.success("Learnings applied to your preferences! 🎓");
        queryClient.invalidateQueries({ queryKey: ['promptFeedback'] });
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }
    },
    onError: (error) => {
      toast.error("Failed to apply learnings");
      console.error(error);
    }
  });

  const unappliedFeedbacks = filteredFeedbacks.filter(f => !f.applied_to_preferences);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Feedback Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            No feedback yet. Give feedback on your prompts from the Vault to help the AI learn your preferences.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (filteredFeedbacks.length === 0 && selectedProjectId !== "all") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Feedback Insights
            </CardTitle>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]">
                <FolderOpen className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects ({feedbacks.length})</SelectItem>
                {projectsWithFeedback.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({feedbacks.filter(f => f.project_id === p.id).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">No feedback for this project yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Feedback Insights ({filteredFeedbacks.length})
            </CardTitle>
            {unappliedFeedbacks.length > 0 && (
              <Badge className="bg-purple-100 text-purple-700">
                {unappliedFeedbacks.length} not applied
              </Badge>
            )}
          </div>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[200px]">
              <FolderOpen className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects ({feedbacks.length})</SelectItem>
              {projectsWithFeedback.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({feedbacks.filter(f => f.project_id === p.id).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Apply learnings from your feedback to automatically improve future prompts
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredFeedbacks.slice(0, 10).map((feedback) => {
            const Icon = RATING_ICONS[feedback.rating];
            const colorClass = RATING_COLORS[feedback.rating];
            const project = projects.find(p => p.id === feedback.project_id);
            
            return (
              <div 
                key={feedback.id} 
                className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`p-1.5 rounded ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-medium capitalize">{feedback.rating}</span>
                      {project && (
                        <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700">
                          {project.name}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(feedback.created_date).toLocaleDateString()}
                      </span>
                      {feedback.applied_to_preferences && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Applied ✓
                        </Badge>
                      )}
                    </div>
                    
                    {feedback.what_worked && (
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-green-600">✓ Worked:</span> {feedback.what_worked}
                      </p>
                    )}
                    
                    {feedback.what_failed && (
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-red-600">✗ Failed:</span> {feedback.what_failed}
                      </p>
                    )}
                  </div>

                  {!feedback.applied_to_preferences && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyFeedbackMutation.mutate(feedback.id)}
                      disabled={applyFeedbackMutation.isPending}
                      className="shrink-0"
                    >
                      {applyFeedbackMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Apply Learning"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}