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

        // Add screenshots with pageHint, componentHint, and placeholder for ocrVision
        if (t.screenshot_ids && t.screenshot_ids.length > 0) {
          taskObj.screenshots = t.screenshot_ids.map(url => ({
            id: url,
            pageHint: t.target_page || "Unknown page",
            componentHint: t.target_component || "Unknown component",
            domain: t.target_domain || "UI",
            ocrVision: "TO_BE_ENRICHED_WITH_CACHE"
          }));
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
  }, [thoughts, selectedThoughtIds, startTemplateId, endTemplateId, includePersonalPrefs, includeProjectConfig, currentUser, selectedProject, templates]);

  const handleImprovePrompt = useCallback(async () => {
    if (!generatedPrompt) return;
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

      // Call backend function with rate limiting using enriched prompt
      const response = await fetch('/api/functions/runPrompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Improve this prompt:\n${enrichedPromptWithVision}${visionContext}\n\nIMPORTANT: Return ONLY the improved prompt content.`,
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