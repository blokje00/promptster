import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export const usePromptGeneration = ({
  thoughts,
  selectedThoughtIds,
  startTemplateId,
  endTemplateId,
  includePersonalPrefs,
  includeProjectConfig,
  currentUser,
  selectedProject,
  templates,
  selectedProjectId
}) => {
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [isImproving, setIsImproving] = useState(false);

  // Autosave improved prompt
  useEffect(() => {
    const savedImproved = localStorage.getItem(`promptster:improved:${selectedProjectId || 'all'}`);
    if (savedImproved) {
      setImprovedPrompt(savedImproved);
    } else {
      setImprovedPrompt("");
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (improvedPrompt) {
      localStorage.setItem(`promptster:improved:${selectedProjectId || 'all'}`, improvedPrompt);
    }
  }, [improvedPrompt, selectedProjectId]);

  const generatedPrompt = useMemo(() => {
    const selectedItems = thoughts.filter(t => selectedThoughtIds.includes(t.id));
    if (selectedItems.length === 0 && !startTemplateId && !endTemplateId) return "";

    const parts = [];

    if (includePersonalPrefs && currentUser?.personal_preferences_markdown) {
      parts.push(currentUser.personal_preferences_markdown);
    }

    if (includeProjectConfig && selectedProject?.technical_config_markdown) {
      parts.push(selectedProject.technical_config_markdown);
    }

    const startTmpl = templates.find(t => t.id === startTemplateId);
    if (startTmpl) parts.push(startTmpl.content);

    if (selectedItems.length > 0) {
      const tasks = selectedItems.map((t, i) => ({
        id: `TASK-${i + 1}`,
        title: t.content.substring(0, 50) + "...",
        description: t.content,
        files: [t.target_page ? `pages/${t.target_page}.jsx` : "TBD"],
        priority: "Medium",
        screenshots: t.screenshot_ids || []
      }));

      const jsonBlock = {
        protocol: { name: "MULTITASK_EXECUTION_v1.0", mode: "serial" },
        subtasks: tasks
      };
      parts.push("```json\n" + JSON.stringify(jsonBlock, null, 2) + "\n```");
    }

    const endTmpl = templates.find(t => t.id === endTemplateId);
    if (endTmpl) parts.push(endTmpl.content);

    return parts.join("\n\n---\n\n");
  }, [thoughts, selectedThoughtIds, startTemplateId, endTemplateId, includePersonalPrefs, includeProjectConfig, currentUser, selectedProject, templates]);

  const handleImprovePrompt = useCallback(async () => {
    if (!generatedPrompt) return;
    setIsImproving(true);
    try {
      const selectedItems = thoughts.filter(t => selectedThoughtIds.includes(t.id));
      const allScreenshotUrls = selectedItems.flatMap(t => t.screenshot_ids || []);

      // Call backend function with rate limiting
      const response = await fetch('/api/functions/runPrompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Improve this prompt:\n${generatedPrompt}\n\nIMPORTANT: Return ONLY the improved prompt content.`,
          file_urls: allScreenshotUrls.length > 0 ? allScreenshotUrls : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(data.error || "Rate limit exceeded");
        } else {
          toast.error(data.error || "AI Improvement failed");
        }
        return;
      }

      setImprovedPrompt(data.result);
      toast.success("Prompt improved");
    } catch (error) {
      console.error("AI Improvement error:", error);
      toast.error("AI Improvement failed");
    } finally {
      setIsImproving(false);
    }
  }, [generatedPrompt, thoughts, selectedThoughtIds]);

  return {
    generatedPrompt,
    improvedPrompt,
    setImprovedPrompt,
    isImproving,
    handleImprovePrompt
  };
};