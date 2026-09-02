import { useState, useEffect, useMemo, useCallback } from "react";
import * as functions from "@/api/functions";
import { invokeLLM } from "@/components/lib/invokeLLM";
import * as prompts from "@/lib/prompts";
import { toast } from "sonner";
export const usePromptGeneration = ({
  thoughts,
  selectedThoughtIds,
  startTemplateId,
  endTemplateId,
  includePersonalPrefs,
  includeProjectConfig,
  includeLearnedPatterns = true,
  includeParserInstruction = true,
  currentUser,
  selectedProject,
  templates,
  selectedProjectId,
  targetModel
}) => {
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [promptVariants, setPromptVariants] = useState([]);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState(null);
  const [showReasoning, setShowReasoning] = useState(false);

  // Shared memos — computed once, reused in generatedPrompt, handleImprovePrompt, handleToggleReasoning
  const selectedItems = useMemo(
    () => thoughts.filter(t => selectedThoughtIds.includes(t.id)),
    [thoughts, selectedThoughtIds]
  );

  const allScreenshotUrls = useMemo(
    () => [...new Set(selectedItems.flatMap(t => t.screenshot_ids || []))],
    [selectedItems]
  );

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
    const key = `promptster:improved:${selectedProjectId || 'all'}`;
    if (improvedPrompt) {
      localStorage.setItem(key, improvedPrompt);
    } else {
      localStorage.removeItem(key);
    }
  }, [improvedPrompt, selectedProjectId]);

  const generatedPrompt = useMemo(() => {
    if (selectedItems.length === 0 && !startTemplateId && !endTemplateId && !includePersonalPrefs && !includeProjectConfig) return "";

    const parts = [];

    if (includePersonalPrefs && currentUser?.personal_preferences_markdown) {
      parts.push(currentUser.personal_preferences_markdown);
    }

    if (includeProjectConfig && selectedProject?.technical_config_markdown) {
      parts.push(selectedProject.technical_config_markdown);
    }

    if (selectedProject?.ai_tool) {
      parts.push(`[DEVELOPMENT_PLATFORM]\nThis app is being built for: ${selectedProject.ai_tool}\nTailor all code output, file paths, and conventions to this platform.\n[/DEVELOPMENT_PLATFORM]`);
    }

    if (targetModel) {
      parts.push(`[TARGET_MODEL]\nThis prompt is intended for: ${targetModel}\nOptimize output format, token usage, and response style for this model.\n[/TARGET_MODEL]`);
    }

    // TIER 3 FEATURE: Include active learned patterns for this project (TASK-1: now toggleable)
    if (includeLearnedPatterns && selectedProject?.learnedPatterns && Array.isArray(selectedProject.learnedPatterns)) {
      const activePatterns = selectedProject.learnedPatterns.filter(p => p.is_active);
      if (activePatterns.length > 0) {
        const patternsBlock = `[LEARNED_PATTERNS]
AI heeft de volgende patterns geleerd uit eerdere feedback:

${activePatterns.map(p => p.pattern_text).join('\n\n')}

Gebruik deze insights bij het uitvoeren van taken.
[/LEARNED_PATTERNS]`;
        parts.push(patternsBlock);
      }
    }

    // TASK-2: Add project-specific LLM Response Parser instruction (TASK-1: now toggleable)
    if (includeParserInstruction && selectedProject?.llm_response_parser_instruction) {
      parts.push(`[LLM_RESPONSE_PARSER]\n${selectedProject.llm_response_parser_instruction}\n[/LLM_RESPONSE_PARSER]`);
    }

    const startTmpl = templates.find(t => t.id === startTemplateId);
    if (startTmpl) parts.push(startTmpl.content);

    // Add Screenshot Context Block if any tasks have screenshots
    const hasScreenshots = selectedItems.some(t => t.screenshot_ids && t.screenshot_ids.length > 0);
    if (hasScreenshots) {
      parts.push(prompts.screenshotContext());
    }

    if (selectedItems.length > 0) {
      const sortedItems = [...selectedItems].sort((a, b) => {
        const aPlanned = a.focus_type === "planned" ? 1 : 0;
        const bPlanned = b.focus_type === "planned" ? 1 : 0;
        return aPlanned - bPlanned;
      });
      const tasks = sortedItems.map((t, i) => {
        const taskObj = {
          id: `TASK-${i + 1}`,
          title: t.content.length > 150 ? t.content.substring(0, 150) + "..." : t.content,
          description: t.content,
          files: [t.target_page ? `pages/${t.target_page}.jsx` : "TBD"],
          priority: "Medium",
          estimated_complexity: t.estimated_complexity || "moderate"
        };

        // Add screenshots with real OCR vision data from thought entity
        if (t.screenshot_ids && t.screenshot_ids.length > 0) {
          const visionResults = t.vision_analysis?.results || [];
          
          taskObj.screenshots = t.screenshot_ids.map((url, idx) => {
            const visionData = visionResults[idx];
            
            // If we have OCR vision data, use it
            if (visionData && visionData.ocr) {
              return {
                id: url,
                pageHint: t.target_page || "Unknown page",
                componentHint: t.target_component || "Unknown component",
                domain: t.target_domain || "UI",
                ocrVision: {
                  ocr: visionData.ocr,
                  regions: visionData.regions,
                  semanticBlocks: visionData.semanticBlocks,
                  layoutRelations: visionData.layoutRelations,
                  visionStructure: visionData.visionStructure,
                  width: visionData.width,
                  height: visionData.height,
                  summary: visionData.summary
                }
              };
            }
            
            // Fallback to placeholder if no vision data yet
            return {
              id: url,
              pageHint: t.target_page || "Unknown page",
              componentHint: t.target_component || "Unknown component",
              domain: t.target_domain || "UI",
              ocrVision: "TO_BE_ENRICHED_WITH_CACHE"
            };
          });
        }

        return taskObj;
      });

      const jsonBlock = {
        protocol: { name: "MULTITASK_EXECUTION_v1.0", mode: "serial" },
        subtasks: tasks
      };
      parts.push("```json\n" + JSON.stringify(jsonBlock, null, 2) + "\n```");

      const hasComplexityVariation = sortedItems.some(t => (t.estimated_complexity || "moderate") === 'simple') 
                                  && sortedItems.some(t => (t.estimated_complexity || "moderate") === 'complex');
      if (hasComplexityVariation) {
        parts.push(`[MIXTURE_OF_EXPERTS_ROUTING]
Route tasks by complexity to optimize cost and speed:
- "simple" tasks → use a fast, cost-efficient model (e.g. GPT-4o-mini, Claude Haiku)
- "moderate" tasks → use a mid-tier model (e.g. GPT-4o, Claude Sonnet)
- "complex" tasks → use the most capable model (e.g. o3, Claude Opus)

Each task in the JSON above includes an "estimated_complexity" field.
Apply this routing strategy when executing the multi-task protocol.
[/MIXTURE_OF_EXPERTS_ROUTING]`);
      }
    }

    const endTmpl = templates.find(t => t.id === endTemplateId);
    if (endTmpl) parts.push(endTmpl.content);

    return parts.join("\n\n---\n\n");
  }, [selectedItems, startTemplateId, endTemplateId, includePersonalPrefs, includeProjectConfig, includeLearnedPatterns, includeParserInstruction, currentUser, selectedProject, templates, selectedProjectId, targetModel]);

  // Defined above handleImprovePrompt (and listed in its deps) so that useCallback
  // rebuilds handleImprovePrompt whenever reasoningSteps/handleToggleReasoning change,
  // instead of a stale closure re-triggering the paid reasoning call on every click.
  const handleToggleReasoning = useCallback(async () => {
    if (showReasoning) {
      setShowReasoning(false);
      return;
    }

    // If reasoning already generated, just show it
    if (reasoningSteps) {
      setShowReasoning(true);
      return;
    }

    // Generate reasoning steps
    if (!generatedPrompt) return;

    try {
      const reasoningPrompt = prompts.reasoningSteps({
        prompt: generatedPrompt,
        taskCount: selectedItems.length,
        hasStartTemplate: !!startTemplateId,
        hasEndTemplate: !!endTemplateId,
        includePersonalPrefs,
        includeProjectConfig
      });

      const data = await functions.runPrompt({ prompt: reasoningPrompt });

      setReasoningSteps(data.result);
      setShowReasoning(true);
      // Only show toast if manually triggered
      if (showReasoning === false && !reasoningSteps) {
        toast.success("Reasoning steps generated");
      }
    } catch (error) {
      console.error("Reasoning generation error:", error);
      toast.error(error.message || "Reasoning generation failed");
    }
  }, [generatedPrompt, selectedItems, startTemplateId, endTemplateId, includePersonalPrefs, includeProjectConfig, showReasoning, reasoningSteps]);

  const handleImprovePrompt = useCallback(async (isUndo = false) => {
    // Undo: clear improved prompt
    if (isUndo) {
      setImprovedPrompt("");
      toast.success("Reverted to original prompt");
      return;
    }

    if (!generatedPrompt) return;

    // Check if Reasoning Transparency is enabled - auto-generate reasoning
    if (!reasoningSteps && currentUser?.enable_reasoning_transparency) {
      handleToggleReasoning();
    }
    
    setIsImproving(true);
    try {
      let visionContext = '';
      let enrichedPromptWithVision = generatedPrompt;
      
      if (allScreenshotUrls.length > 0) {
        try {
          // Promise.all preserves input order, so zip allScreenshotUrls[i] with
          // visionResults[i] into a URL-keyed Map before a single failed call (caught
          // below, resolves to null) can shift the indices of the others.
          const visionResults = await Promise.all(
            allScreenshotUrls.map(url =>
              functions.analyzeScreenshotWithCache({
                screenshotUrl: url,
                level: 'full'
              }).catch(() => null)
            )
          );

          const analysisByUrl = new Map();
          allScreenshotUrls.forEach((url, idx) => {
            const data = visionResults[idx];
            if (data?.ok) {
              analysisByUrl.set(url, data);
            }
          });

          if (analysisByUrl.size > 0) {
            // Replace "TO_BE_ENRICHED_WITH_CACHE" placeholders with actual OCR data
            enrichedPromptWithVision = generatedPrompt;
            allScreenshotUrls.forEach((url) => {
              const analysis = analysisByUrl.get(url);
              if (analysis) {
                const ocrData = {
                  ocr: analysis.ocr,
                  regions: analysis.regions,
                  semanticBlocks: analysis.semanticBlocks,
                  layoutRelations: analysis.layoutRelations,
                  visionStructure: analysis.visionStructure,
                  width: analysis.width,
                  height: analysis.height,
                  summary: analysis.summary
                };
                enrichedPromptWithVision = enrichedPromptWithVision.replace(
                  '"TO_BE_ENRICHED_WITH_CACHE"',
                  JSON.stringify(ocrData, null, 2)
                );
              }
            });

            const analyses = [...analysisByUrl.values()];
            visionContext = `\n\n**Screenshot Analysis (OCR Vision):**\n${analyses.map((a, i) =>
              `Screenshot ${i + 1}: ${a.regions?.length || 0} UI elements detected\n- Text: "${a.ocr?.text?.substring(0, 150) || 'None'}..."`
            ).join('\n')}\n`;
          }
        } catch (error) {
          // Vision analysis failed, continue without it
        }
      }

      // Check if Verbalized Sampling is enabled
      const verbalizedSamplingEnabled = currentUser?.enable_verbalized_sampling || false;

      const improvePromptInstruction = prompts.improvePrompt({
        prompt: enrichedPromptWithVision,
        verbalizedSampling: verbalizedSamplingEnabled
      });

      // Call backend function with rate limiting - DON'T send file_urls (AI can't access them anyway)
      let data;
      try {
        data = await functions.runPrompt({ prompt: improvePromptInstruction });
      } catch (error) {
        toast.error(error.message || "AI Improvement failed");
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
  }, [generatedPrompt, selectedItems, allScreenshotUrls, currentUser, reasoningSteps, handleToggleReasoning]);

  const handleGenerateVariants = useCallback(async () => {
    if (!generatedPrompt) return;
    
    setIsGeneratingVariants(true);
    try {
      // Verbalized Sampling: generate 3 diverse variants
      const vsPrompt = prompts.promptVariants({ prompt: generatedPrompt });

      const parsed = await invokeLLM({
        prompt: vsPrompt,
        response_json_schema: prompts.promptVariantsSchema
      });

      if (Array.isArray(parsed?.variants) && parsed.variants.length > 0) {
        setPromptVariants(parsed.variants);
        toast.success(`✨ Generated ${parsed.variants.length} prompt variants`);
      } else {
        throw new Error("Invalid variants format");
      }
    } catch (error) {
      console.error("Variant generation error:", error);
      toast.error("Variant generation failed");
    } finally {
      setIsGeneratingVariants(false);
    }
  }, [generatedPrompt, currentUser]);

  return {
    generatedPrompt,
    improvedPrompt,
    setImprovedPrompt,
    isImproving,
    handleImprovePrompt,
    promptVariants,
    isGeneratingVariants,
    handleGenerateVariants,
    reasoningSteps,
    showReasoning,
    handleToggleReasoning
  };
};