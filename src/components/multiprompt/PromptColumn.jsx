import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { projectColors, projectBorderColors } from "@/components/lib/constants";
import TemplateSelector from "./TemplateSelector";
import PromptPreview from "./PromptPreview";

function PromptColumn({
  templates,
  templateSelection,
  selectedProject,
  promptGeneration,
  saveSuccess,
  handleQuickSave,
}) {
  return (
    <div className="space-y-4">
      <TemplateSelector
        templates={templates}
        {...templateSelection}
        onStartTemplateChange={templateSelection.setStartTemplateId}
        onEndTemplateChange={templateSelection.setEndTemplateId}
        selectedProject={selectedProject}
      />
      <div className="flex gap-4 text-sm px-1">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`relative w-5 h-5 rounded border-2 transition-all ${
            templateSelection.includePersonalPrefs
              ? `${selectedProject ? projectBorderColors[selectedProject.color] : 'border-indigo-600'} ${selectedProject ? projectColors[selectedProject.color] : 'bg-indigo-600'}`
              : 'border-slate-300 bg-white group-hover:border-slate-400'
          }`}>
            {templateSelection.includePersonalPrefs && (
              <CheckCircle2 className="absolute inset-0 w-full h-full text-white p-0.5" strokeWidth={3} />
            )}
          </div>
          <Checkbox
            checked={templateSelection.includePersonalPrefs}
            onCheckedChange={templateSelection.setIncludePersonalPrefs}
            className="sr-only"
          />
          <a
            href={createPageUrl("AIBackoffice") + "#personal-preferences"}
            className="font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Personal Prefs
          </a>
        </label>
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`relative w-5 h-5 rounded border-2 transition-all ${
            templateSelection.includeProjectConfig
              ? `${selectedProject ? projectBorderColors[selectedProject.color] : 'border-indigo-600'} ${selectedProject ? projectColors[selectedProject.color] : 'bg-indigo-600'}`
              : 'border-slate-300 bg-white group-hover:border-slate-400'
          }`}>
            {templateSelection.includeProjectConfig && (
              <CheckCircle2 className="absolute inset-0 w-full h-full text-white p-0.5" strokeWidth={3} />
            )}
          </div>
          <Checkbox
            checked={templateSelection.includeProjectConfig}
            onCheckedChange={templateSelection.setIncludeProjectConfig}
            className="sr-only"
          />
          <a
            href={createPageUrl("AIBackoffice") + "#project-config"}
            className="font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Project Config
          </a>
        </label>
      </div>
      <PromptPreview
        {...promptGeneration}
        setImprovedPrompt={promptGeneration.setImprovedPrompt}
        onImprove={promptGeneration.handleImprovePrompt}
        onRefresh={() => {
          promptGeneration.setImprovedPrompt("");
        }}
        saveSuccess={saveSuccess}
        onQuickSave={handleQuickSave}
        promptVariants={promptGeneration.promptVariants}
        isGeneratingVariants={promptGeneration.isGeneratingVariants}
        onGenerateVariants={promptGeneration.handleGenerateVariants}
        reasoningSteps={promptGeneration.reasoningSteps}
        showReasoning={promptGeneration.showReasoning}
        onToggleReasoning={promptGeneration.handleToggleReasoning}
      />
    </div>
  );
}

export default React.memo(PromptColumn);