import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { hasProFeatureAccess } from "@/components/lib/subscriptionUtils";

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
  const [promptVariants, setPromptVariants] = useState([]);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState(null);
  const [showReasoning, setShowReasoning] = useState(false);

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
    if (selectedItems.length === 0 && !startTemplateId && !endTemplateId && !includePersonalPrefs && !includeProjectConfig) return "";

    const parts = [];

    if (includePersonalPrefs && currentUser?.personal_preferences_markdown) {
      parts.push(currentUser.personal_preferences_markdown);
    }

    if (includeProjectConfig && selectedProject?.technical_config_markdown) {
      parts.push(selectedProject.technical_config_markdown);
    }

    // TASK-2: Add project-specific LLM Response Parser instruction
    if (selectedProject?.llm_response_parser_instruction) {
      parts.push(`[LLM_RESPONSE_PARSER]\n${selectedProject.llm_response_parser_instruction}\n[/LLM_RESPONSE_PARSER]`);
    }

    const startTmpl = templates.find(t => t.id === startTemplateId);
    if (startTmpl) parts.push(startTmpl.content);

    // Add Screenshot Context Block if any tasks have screenshots
    const hasScreenshots = selectedItems.some(t => t.screenshot_ids && t.screenshot_ids.length > 0);
    if (hasScreenshots) {
      parts.push(`[SCREENSHOT_CONTEXT]

Je krijgt per taak optioneel een of meer screenshots:

- "pageHint" en "componentHint" geven de vermoedelijke pagina / sectie / functie aan.
- "ocrVision" bevat:
  - ocr.text en ocr.regions → alle zichtbare tekst
  - semanticBlocks → gegroepeerde UI-/content-blokken
  - layoutRelations → relaties tussen blokken
  - visionStructure → hogere-orde interpretatie van de UI

Gebruik deze context om beter te begrijpen:
- op welke pagina we zijn;
- welke knoppen, dropdowns, inputs zichtbaar zijn;
- waar een wijziging precies moet plaatsvinden.

Als er meerdere screenshots zijn, behandel ze als aparte "views" van dezelfde app.

[/SCREENSHOT_CONTEXT]`);
    }

    if (selectedItems.length > 0) {
      const tasks = selectedItems.map((t, i) => {
        const taskObj = {
          id: `TASK-${i + 1}`,
          title: t.content.length > 150 ? t.content.substring(0, 150) + "..." : t.content,
          description: t.content,
          files: [t.target_page ? `pages/${t.target_page}.jsx` : "TBD"],
          priority: "Medium"
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
    }

    const endTmpl = templates.find(t => t.id === endTemplateId);
    if (endTmpl) parts.push(endTmpl.content);

    return parts.join("\n\n---\n\n");
  }, [thoughts, selectedThoughtIds, startTemplateId, endTemplateId, includePersonalPrefs, includeProjectConfig, currentUser, selectedProject, templates, selectedProjectId]);

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
    
    // PRO feature check
    if (!hasProFeatureAccess(currentUser)) {
      const isTrialing = currentUser?.subscription_status === 'trialing';
      const trialEnd = currentUser?.trial_ends_at || currentUser?.trial_end;
      
      if (isTrialing && trialEnd) {
        const daysLeft = Math.ceil((new Date(trialEnd) - new Date()) / (1000 * 60 * 60 * 24));
        toast.error(`AI Improvement requires PRO plan. Trial ends in ${daysLeft} days.`, {
          description: 'Upgrade to PRO for unlimited AI features',
          action: {
            label: 'Upgrade',
            onClick: () => window.location.href = '/Subscription'
          }
        });
      } else {
        toast.error('Upgrade to PRO to use AI Prompt Improvement', {
          description: 'This feature is only available in PRO plan',
          action: {
            label: 'View Plans',
            onClick: () => window.location.href = '/Subscription'
          }
        });
      }
      return;
    }
    
    setIsImproving(true);
    try {
      const selectedItems = thoughts.filter(t => selectedThoughtIds.includes(t.id));
      const allScreenshotUrls = selectedItems.flatMap(t => t.screenshot_ids || []);

      // Get cached vision analysis for screenshots and enrich prompt
      let visionContext = '';
      let enrichedPromptWithVision = generatedPrompt;
      
      if (allScreenshotUrls.length > 0) {
        try {
          console.log('[usePromptGeneration] Fetching OCR vision for', allScreenshotUrls.length, 'screenshots');
          const visionResults = await Promise.all(
            allScreenshotUrls.map(url => 
              base44.functions.invoke('analyzeScreenshotWithCache', {
                screenshotUrl: url,
                level: 'full'
              })
            )
          );
          
          const analyses = visionResults
            .map(r => r.data)
            .filter(d => d?.ok);
          
          if (analyses.length > 0) {
            console.log('[usePromptGeneration] ✓ OCR vision fetched for', analyses.length, 'screenshots');
            
            // Replace "TO_BE_ENRICHED_WITH_CACHE" placeholders with actual OCR data
            enrichedPromptWithVision = generatedPrompt;
            allScreenshotUrls.forEach((url, idx) => {
              const analysis = analyses[idx];
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
            
            visionContext = `\n\n**Screenshot Analysis (OCR Vision):**\n${analyses.map((a, i) => 
              `Screenshot ${i + 1}: ${a.regions?.length || 0} UI elements detected\n- Text: "${a.ocr?.text?.substring(0, 150) || 'None'}..."`
            ).join('\n')}\n`;
          }
        } catch (error) {
          console.warn('[usePromptGeneration] Vision analysis failed:', error);
        }
      }

      // Check if Verbalized Sampling is enabled
      const verbalizedSamplingEnabled = currentUser?.enable_verbalized_sampling || false;
      
      let improvePromptInstruction = `Improve and optimize this multi-task prompt for better clarity and execution:\n\n${enrichedPromptWithVision}\n\nIMPORTANT: Return ONLY the improved prompt content, keeping the JSON structure and all screenshot data intact.`;
      
      if (verbalizedSamplingEnabled) {
        improvePromptInstruction = `You are using Verbalized Sampling to improve this prompt with maximum diversity.

ORIGINAL PROMPT:
${enrichedPromptWithVision}

TASK: Generate ONE improved version that takes an atypical, creative approach (avoid the most obvious solution). Consider:
- Alternative execution strategies
- Different levels of detail
- Unconventional but effective structures
- Novel perspectives on the tasks

IMPORTANT: Return ONLY the improved prompt content, keeping the JSON structure and all screenshot data intact. Be creative but maintain functionality.`;
      }
      
      // Call backend function with rate limiting - DON'T send file_urls (AI can't access them anyway)
      const response = await base44.functions.invoke('runPrompt', {
        prompt: improvePromptInstruction
      });

      const data = response.data;

      if (response.status !== 200 || data.error) {
        toast.error(data.error || "AI Improvement failed");
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
  }, [generatedPrompt, thoughts, selectedThoughtIds, currentUser]);

  const handleGenerateVariants = useCallback(async () => {
    console.log('[usePromptGeneration] 🚀 handleGenerateVariants called');
    console.log('[usePromptGeneration] generatedPrompt:', generatedPrompt?.substring(0, 100));
    
    if (!generatedPrompt) {
      console.log('[usePromptGeneration] ❌ No generatedPrompt');
      return;
    }
    
    // PRO feature check
    console.log('[usePromptGeneration] Checking PRO access...');
    if (!hasProFeatureAccess(currentUser)) {
      console.log('[usePromptGeneration] ❌ No PRO access');
      toast.error('Upgrade to PRO to use Verbalized Sampling', {
        description: 'Generate multiple diverse prompt variants',
        action: {
          label: 'View Plans',
          onClick: () => window.location.href = '/Subscription'
        }
      });
      return;
    }
    
    console.log('[usePromptGeneration] ✅ PRO access granted, starting generation...');
    setIsGeneratingVariants(true);
    try {
      // Verbalized Sampling prompt: ask LLM to generate 3 variants with probabilities
      const vsPrompt = `You are a prompt engineering expert. Generate exactly 3 diverse variants of the following multi-task prompt, each taking a different strategic approach. For each variant, estimate its "typicality probability" (0.0-1.0, where higher = more typical/conventional).

ORIGINAL PROMPT:
${generatedPrompt}

OUTPUT FORMAT (strict JSON):
{
  "variants": [
    {
      "content": "Full prompt variant 1...",
      "probability": 0.8,
      "approach": "Conservative - minimal changes"
    },
    {
      "content": "Full prompt variant 2...",
      "probability": 0.5,
      "approach": "Balanced - moderate restructuring"
    },
    {
      "content": "Full prompt variant 3...",
      "probability": 0.2,
      "approach": "Creative - novel approach"
    }
  ]
}

RULES:
- Each variant must be a complete, executable prompt (keep JSON structure intact)
- Variants should differ in: tone, structure, level of detail, or execution strategy
- Ensure at least one variant is "atypical" (probability < 0.4)
- Return ONLY valid JSON, no markdown fences`;

      console.log('[usePromptGeneration] 📡 Calling runPrompt backend...');
      const response = await base44.functions.invoke('runPrompt', {
        prompt: vsPrompt
      });

      console.log('[usePromptGeneration] 📥 Response received:', response);
      const data = response.data;

      if (response.status !== 200 || data.error) {
        console.error('[usePromptGeneration] ❌ Backend error:', data.error);
        toast.error(data.error || "Variant generation failed");
        return;
      }

      console.log('[usePromptGeneration] 📦 Raw result:', data.result);

      // Parse JSON response - handle markdown code fences
      try {
        let cleanResult = data.result.trim();
        console.log('[usePromptGeneration] 🧹 Cleaning result...');
        // Remove markdown code fences if present
        cleanResult = cleanResult.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        
        console.log('[usePromptGeneration] 🔍 Parsing JSON...');
        const parsed = JSON.parse(cleanResult);
        console.log('[usePromptGeneration] ✅ Parsed variants:', parsed);
        
        if (parsed.variants && Array.isArray(parsed.variants) && parsed.variants.length > 0) {
          console.log('[usePromptGeneration] 💾 Setting variants state:', parsed.variants.length);
          setPromptVariants(parsed.variants);
          toast.success(`✨ Generated ${parsed.variants.length} prompt variants`);
        } else {
          throw new Error("Invalid variants format");
        }
      } catch (parseError) {
        console.error("[usePromptGeneration] ❌ Parse error:", parseError, "Raw response:", data.result);
        // Fallback: show raw response as single variant
        const fallbackVariant = {
          content: data.result,
          probability: 0.5,
          approach: "Generated variant"
        };
        console.log('[usePromptGeneration] 🔄 Using fallback variant:', fallbackVariant);
        setPromptVariants([fallbackVariant]);
        toast.warning("Variants generated but format may be irregular");
      }
    } catch (error) {
      console.error("Variant generation error:", error);
      toast.error("Variant generation failed");
    } finally {
      setIsGeneratingVariants(false);
    }
  }, [generatedPrompt, currentUser]);

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
      const selectedItems = thoughts.filter(t => selectedThoughtIds.includes(t.id));
      const reasoningPrompt = `You are analyzing how you would interpret and execute the following multi-task prompt. Explain your reasoning process in 3-5 concise steps:

1. **Interpretation**: How do you understand the tasks and their context?
2. **Planning**: What is your execution strategy?
3. **Prioritization**: Which tasks are most critical and why?
4. **Dependencies**: Are there any task dependencies or order requirements?
5. **Context Usage**: How would you use templates, preferences, and project config?

PROMPT TO ANALYZE:
${generatedPrompt}

SELECTED TASKS: ${selectedItems.length}
- Templates: ${startTemplateId ? 'Start' : ''} ${endTemplateId ? 'End' : ''}
- Personal Prefs: ${includePersonalPrefs ? 'Yes' : 'No'}
- Project Config: ${includeProjectConfig ? 'Yes' : 'No'}

Return your reasoning as clear, numbered steps (max 200 words).`;

      const response = await base44.functions.invoke('runPrompt', {
        prompt: reasoningPrompt
      });

      const data = response.data;

      if (response.status === 200 && !data.error) {
        setReasoningSteps(data.result);
        setShowReasoning(true);
        // Only show toast if manually triggered
        if (showReasoning === false && !reasoningSteps) {
          toast.success("Reasoning steps generated");
        }
      } else {
        toast.error("Failed to generate reasoning");
      }
    } catch (error) {
      console.error("Reasoning generation error:", error);
      toast.error("Reasoning generation failed");
    }
  }, [generatedPrompt, thoughts, selectedThoughtIds, startTemplateId, endTemplateId, includePersonalPrefs, includeProjectConfig, showReasoning, reasoningSteps]);

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