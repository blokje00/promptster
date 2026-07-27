import React from "react";
import PromptRecipe from "./PromptRecipe";
import PromptPreview from "./PromptPreview";

function PromptColumn({
  templates,
  templateSelection,
  selectedProject,
  promptGeneration,
  saveSuccess,
  handleQuickSave,
  currentUser,
  selectedTaskCount,
}) {
  return (
    <div className="space-y-4">
      {/* TASK-1: single "Prompt Recipe" panel replaces the separate template
          card + Personal Prefs / Project Config checkboxes */}
      <PromptRecipe
        templates={templates}
        templateSelection={templateSelection}
        selectedProject={selectedProject}
        currentUser={currentUser}
        selectedTaskCount={selectedTaskCount}
      />
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
