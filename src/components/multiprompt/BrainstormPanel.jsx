import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import * as thoughts from "@/api/thoughts";
import { invokeLLM } from "@/components/lib/invokeLLM";
import { brainstormIdeas, brainstormIdeasSchema } from "@/lib/prompts";
import { Lightbulb, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
/**
 * Creative Brainstorm Tool - TIER 2 Feature #4
 * Genereert diverse ideeën met Verbalized Sampling
 */
export default function BrainstormPanel({ currentUser, selectedProjectId }) {
  const [concept, setConcept] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // thoughts.useCreate() already invalidates activeThoughts/deletedThoughts/
  // allThoughtsCount/thoughts (see invalidateThoughtCaches in src/api/thoughts.js),
  // covering the keys the Multiprompt/Header lists actually read.
  const createThoughtMutation = thoughts.useCreate({
    onSuccess: () => {
      toast.success("Idea added to tasks!");
    }
  });

  const handleGenerate = async () => {
    if (!concept.trim()) {
      toast.error("Enter a concept or question first");
      return;
    }

    setIsGenerating(true);
    try {
      const brainstormPrompt = brainstormIdeas({ concept });

      const parsed = await invokeLLM({
        prompt: brainstormPrompt,
        response_json_schema: brainstormIdeasSchema
      });

      if (Array.isArray(parsed?.ideas) && parsed.ideas.length > 0) {
        setIdeas(parsed.ideas);
        toast.success(`✨ Generated ${parsed.ideas.length} ideas`);
      } else {
        throw new Error("Invalid ideas format");
      }
    } catch (error) {
      console.error("Brainstorm error:", error);
      toast.error("Failed to generate ideas");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddIdea = async (idea) => {
    const thoughtContent = `${idea.title}\n\n${idea.description}`;
    
    await createThoughtMutation.mutateAsync({
      content: thoughtContent,
      project_id: selectedProjectId || "",
      is_selected: true,
      focus_type: 'both'
    });
  };

  const getUniquenessColor = (score) => {
    if (score >= 0.7) return "bg-blue-100 text-blue-700";
    if (score >= 0.4) return "bg-purple-100 text-purple-700";
    return "bg-pink-100 text-pink-700";
  };

  const getDifficultyColor = (difficulty) => {
    if (difficulty === 'easy') return "bg-green-100 text-green-700";
    if (difficulty === 'medium') return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
          Creative Brainstorm
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Generate diverse ideas with AI-powered brainstorming
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Enter your concept, question, or problem statement...&#10;&#10;Example: 'How can I improve user onboarding in my SaaS app?'"
            className="min-h-[100px]"
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !concept.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Ideas...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate 7 Ideas
              </>
            )}
          </Button>
        </div>

        {ideas.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Generated Ideas ({ideas.length})
            </h3>
            {ideas.map((idea, idx) => (
              <Card key={idx} className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        {idea.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {idea.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddIdea(idea)}
                      disabled={createThoughtMutation.isPending}
                      className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getUniquenessColor(idea.uniqueness)}>
                      {idea.uniqueness >= 0.7 ? '🎯 Conventional' : idea.uniqueness >= 0.4 ? '💡 Creative' : '🚀 Unique'}
                    </Badge>
                    <Badge className={getDifficultyColor(idea.difficulty)}>
                      {idea.difficulty}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {ideas.length === 0 && !isGenerating && (
          <div className="text-center py-8 text-slate-400">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Enter a concept and generate ideas to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}