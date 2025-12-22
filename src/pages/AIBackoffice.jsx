import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FolderTree, Settings } from "lucide-react";
import AccessGuard from "../components/auth/AccessGuard";
import { useAutosaveField } from "@/components/hooks/useAutosaveField";
import { useReliableSaveButton } from "@/components/hooks/useReliableSaveButton";
import UPSEPanel from "../components/upse/UPSEPanel";
import MaintenanceTools from "../components/settings/MaintenanceTools";
import AIInstructionForm from "../components/settings/AIInstructionForm";
import PersonalPreferencesForm from "../components/settings/PersonalPreferencesForm";
import AIContextToggle from "../components/settings/AIContextToggle";
import TierAdvisorToggles from "../components/settings/TierAdvisorToggles";
import { toast } from "sonner";

const getDefaultInstruction = () => `You are optimizing a multi-task prompt that may include screenshots and OCR vision data.

YOUR TASK:
Improve the prompt's clarity, structure, and technical precision while keeping ALL content intact (especially JSON blocks and screenshot data).

CRITICAL RULES:
- NEVER say "I cannot access files/screenshots" - the screenshot data is embedded in the prompt as JSON
- Keep all JSON structures exactly as they are (including ocrVision data)
- Improve only the text instructions and formatting
- Make the prompt more actionable and precise
- Return ONLY the improved prompt, no meta-commentary

Focus on making instructions clearer and more structured, while preserving all technical details and data.`;

const DEFAULT_PERSONAL_PREFERENCES = `# My Personal Development Preferences

## Code Style
- Naming: camelCase for variables, PascalCase for components
- Async: Always async/await, never promise chains
- Error handling: Try-catch around all async operations
- Comments: JSDoc for functions, inline for complex logic

## UI/UX Philosophy
- Design: Minimalist, focus on usability
- Icons: Lucide React (first choice)
- Responsiveness: Mobile-first approach
- Accessibility: WCAG 2.1 AA minimum

## Testing & Validation
- Coverage target: 80% for critical paths
- Edge cases: Always at least 3 edge cases per feature

## Task Structure
- Priority labels: Critical/High/Medium/Low
- Task format: What/Where/Why structure
`;

const DEFAULT_RETRY_MESSAGE = `You are the Base44 code assistant for the Promptster webapp.

GOAL
Take the failed or rejected task, the user's short explanation, and the attached screenshot, and UPDATE the Promptster codebase so that the problem is structurally fixed for ALL users – not just as a one-off patch.

CONTEXT

* Tech stack: React + Tailwind CSS + shadcn/ui, Lucide icons.
* Structure: \`pages/\` for pages, \`components/\` for reusable UI, \`entities/\` for data models, \`functions/\` for backend/logic.
* Follow Patrick's preferences: camelCase, async/await, clear comments, minimalistic UI, dark-mode support, accessible components.

WHEN PROCESSING A RETRY

1. Carefully inspect the attached screenshot and the user's explanation of what is missing, incorrect, or not visible.
2. Locate the correct files in the Promptster codebase where this behaviour is defined (pages, components, styles, or backend functions).
3. Change the code so that the behaviour works correctly and consistently for ALL users and all relevant pages / states.
4. Avoid one-off hacks or hard-coded values tied to a single user, project, or environment.
5. Keep the implementation clean, testable, and aligned with existing patterns in the app.

DELIVERABLE

* Implement the necessary code changes.
* Ensure light and dark mode both work correctly.
* Make sure the fix is visible in the UI (no invisible changes).
* At the end, briefly list:

  * Which files were changed (with paths),
  * A short summary per file,
  * A 3-line manual test checklist the user can run to verify the fix.`;

// Retry message examples for "Load example" button cycling
const RETRY_MESSAGE_EXAMPLES = [
  `You are the Base44 code assistant for the Promptster webapp.

GOAL
Take the failed or rejected task, the user's short explanation, and the attached screenshot, and UPDATE the Promptster codebase so that the problem is structurally fixed for ALL users – not just as a one-off patch.

CONTEXT

* Tech stack: React + Tailwind CSS + shadcn/ui, Lucide icons.
* Structure: \`pages/\` for pages, \`components/\` for reusable UI, \`entities/\` for data models, \`functions/\` for backend/logic.
* Follow Patrick's preferences: camelCase, async/await, clear comments, minimalistic UI, dark-mode support, accessible components.

WHEN PROCESSING A RETRY

1. Carefully inspect the attached screenshot and the user's explanation of what is missing, incorrect, or not visible.
2. Locate the correct files in the Promptster codebase where this behaviour is defined (pages, components, styles, or backend functions).
3. Change the code so that the behaviour works correctly and consistently for ALL users and all relevant pages / states.
4. Avoid one-off hacks or hard-coded values tied to a single user, project, or environment.
5. Keep the implementation clean, testable, and aligned with existing patterns in the app.

DELIVERABLE

* Implement the necessary code changes.
* Ensure light and dark mode both work correctly.
* Make sure the fix is visible in the UI (no invisible changes).
* At the end, briefly list:

  * Which files were changed (with paths),
  * A short summary per file,
  * A 3-line manual test checklist the user can run to verify the fix.`,

  `You are the Base44 code assistant for the Promptster webapp.

GOAL
Take the failed or rejected task, the user's short explanation, and the attached screenshot, and UPDATE the Promptster codebase so that the problem is structurally fixed for ALL users – not just as a one-off patch.

CONTEXT

* Tech stack: React + Tailwind CSS + shadcn/ui, Lucide icons.
* Structure: \`pages/\` for pages, \`components/\` for reusable UI, \`entities/\` for data models, \`functions/\` for backend/logic.
* Follow Patrick's preferences: camelCase, async/await, clear comments, minimalistic UI, dark-mode support, accessible components.

WHEN PROCESSING A RETRY

1. Carefully inspect the attached screenshot and the user's explanation of what is missing, incorrect, or not visible.
2. Locate the correct files in the Promptster codebase where this behaviour is defined (pages, components, styles, or backend functions).
3. Change the code so that the behaviour works correctly and consistently for ALL users and all relevant pages / states.
4. Avoid one-off hacks or hard-coded values tied to a single user, project, or environment.
5. Keep the implementation clean, testable, and aligned with existing patterns in the app.

DELIVERABLE

* Implement the necessary code changes.
* Ensure light and dark mode both work correctly.
* Make sure the fix is visible in the UI (no invisible changes).
* At the end, briefly list:

  * Which files were changed (with paths),
  * A short summary per file,
  * A 3-line manual test checklist the user can run to verify the fix.`,

  `You are the Base44 code assistant for the Promptster webapp.

GOAL
Take the failed or rejected task, the user's short explanation, and the attached screenshot, and UPDATE the Promptster codebase so that the problem is structurally fixed for ALL users – not just as a one-off patch.

CONTEXT

* Tech stack: React + Tailwind CSS + shadcn/ui, Lucide icons.
* Structure: \`pages/\` for pages, \`components/\` for reusable UI, \`entities/\` for data models, \`functions/\` for backend/logic.
* Follow Patrick's preferences: camelCase, async/await, clear comments, minimalistic UI, dark-mode support, accessible components.

WHEN PROCESSING A RETRY

1. Carefully inspect the attached screenshot and the user's explanation of what is missing, incorrect, or not visible.
2. Locate the correct files in the Promptster codebase where this behaviour is defined (pages, components, styles, or backend functions).
3. Change the code so that the behaviour works correctly and consistently for ALL users and all relevant pages / states.
4. Avoid one-off hacks or hard-coded values tied to a single user, project, or environment.
5. Keep the implementation clean, testable, and aligned with existing patterns in the app.

DELIVERABLE

* Implement the necessary code changes.
* Ensure light and dark mode both work correctly.
* Make sure the fix is visible in the UI (no invisible changes).
* At the end, briefly list:

  * Which files were changed (with paths),
  * A short summary per file,
  * A 3-line manual test checklist the user can run to verify the fix.`
];

export default function AIBackoffice() {
  const queryClient = useQueryClient();
  const [modelPreference, setModelPreference] = useState("default");
  const [enableContextSuggestions, setEnableContextSuggestions] = useState(true);
  const [settingsId, setSettingsId] = useState(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [savedAIValues, setSavedAIValues] = useState({
    instruction: "",
    modelPreference: "default",
    enableContextSuggestions: true
  });

  // Fetch currentUser FIRST (no dependencies)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => await base44.auth.me(),
    staleTime: 30_000,
  });

  // HARDENED: AISettings can fail without blocking page
  const { data: settings = [] } = useQuery({
    queryKey: ['aiSettings', currentUser?.email],
    queryFn: async () => {
      try {
        if (!currentUser?.email) return [];
        return await base44.entities.AISettings.filter({ created_by: currentUser.email }) || [];
      } catch (error) {
        console.warn('[AIBackoffice] AISettings fetch failed (non-blocking):', error.message);
        return []; // Graceful fallback - use defaults
      }
    },
    enabled: Boolean(currentUser?.email),
    retry: false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Project.filter({ created_by: currentUser.email });
    },
    enabled: Boolean(currentUser?.email),
  });

  const { data: projectStructures = [] } = useQuery({
    queryKey: ['projectStructures', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.ProjectStructure.filter({ created_by: currentUser.email });
    },
    enabled: Boolean(currentUser?.email),
  });

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const currentProjectStructure = projectStructures.find(ps => ps.project_id === selectedProjectId);

  const structureMutation = useMutation({
    mutationFn: async (data) => {
      const existing = projectStructures.find(ps => ps.project_id === data.project_id);
      if (existing) {
        return base44.entities.ProjectStructure.update(existing.id, data);
      } else {
        return base44.entities.ProjectStructure.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectStructures'] });
      toast.success("Project structure saved");
    },
  });

  const { value: instruction, setValue: setInstruction, resetValue: resetInstruction } = useAutosaveField({
    storageKey: `promptster:aibackoffice:instruction:${currentUser?.id ?? 'anon'}`,
    initialValue: settings[0]?.improve_prompt_instruction || getDefaultInstruction(),
    enabled: !!currentUser?.id,
  });

  const personalPrefsHook = useReliableSaveButton({
    storageKey: `promptster:personalPrefs:${currentUser?.id ?? 'anon'}`,
    initialValue: currentUser?.personal_preferences_markdown || "",
    mutationFn: async (draft) => {
      await base44.auth.updateMe({ personal_preferences_markdown: draft });
      return { success: true };
    },
    invalidateKeys: [['currentUser']]
  });

  const retryMessageHook = useReliableSaveButton({
    storageKey: `promptster:retryMessage:${currentUser?.id ?? 'anon'}`,
    initialValue: currentUser?.retry_task_message || DEFAULT_RETRY_MESSAGE,
    mutationFn: async (draft) => {
      await base44.auth.updateMe({ retry_task_message: draft });
      return { success: true };
    },
    invalidateKeys: [['currentUser']]
  });

  useEffect(() => {
    if (settings.length > 0 && !settingsId) {
      const dbInstruction = settings[0].improve_prompt_instruction;
      const dbModelPref = settings[0].model_preference || "default";
      const dbContextSuggestions = settings[0].enable_context_suggestions !== false;
      
      if (dbInstruction) setInstruction(dbInstruction);
      setModelPreference(dbModelPref);
      setEnableContextSuggestions(dbContextSuggestions);
      setSettingsId(settings[0].id);
      
      // Set saved values for dirty tracking
      setSavedAIValues({
        instruction: dbInstruction || getDefaultInstruction(),
        modelPreference: dbModelPref,
        enableContextSuggestions: dbContextSuggestions
      });
    }
  }, [settings, settingsId]);


  


  const handleSave = async () => {
    // Guard: prevent save if user not loaded yet
    if (!currentUser?.email) {
      toast.error("User not loaded yet");
      return;
    }

    // Guard: prevent double-click / multiple saves in flight
    if (isSavingAI) return;
    
    setIsSavingAI(true);
    
    try {
      // Normalize payload
      const payload = {
        improve_prompt_instruction: (instruction || "").trim(),
        model_preference: modelPreference || "default",
        enable_context_suggestions: !!enableContextSuggestions,
        created_by: currentUser.email
      };

      let saved;
      if (settingsId) {
        saved = await base44.entities.AISettings.update(settingsId, payload);
      } else {
        saved = await base44.entities.AISettings.create(payload);
        setSettingsId(saved.id);
      }

      // Optimistic cache update
      queryClient.setQueryData(['aiSettings', currentUser.email], (old = []) => {
        const idx = old.findIndex((s) => s.id === saved.id);
        if (idx === -1) return [saved, ...old];
        const next = [...old];
        next[idx] = saved;
        return next;
      });

      // Invalidate for consistency
      queryClient.invalidateQueries({ queryKey: ['aiSettings', currentUser.email] });

      // Update saved values (reset dirty state)
      setSavedAIValues({
        instruction: payload.improve_prompt_instruction,
        modelPreference: payload.model_preference,
        enableContextSuggestions: payload.enable_context_suggestions
      });

      // Reset autosave baseline to prevent unexpected jumps
      resetInstruction(payload.improve_prompt_instruction);

      toast.success("AI settings saved");
    } catch (error) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSavingAI(false);
    }
  };

  const handleSavePersonalPreferences = async () => {
    await personalPrefsHook.handleSave();
    if (!personalPrefsHook.error) {
      toast.success("Personal preferences saved");
    } else {
      toast.error("Could not save preferences");
    }
  };

  const handleSaveRetryMessage = async () => {
    await retryMessageHook.handleSave();
    if (!retryMessageHook.error) {
      toast.success("Retry task message saved");
    } else {
      toast.error("Could not save retry message");
    }
  };

  // Load next example retry message (cycles through RETRY_MESSAGE_EXAMPLES)
  const handleLoadExample = () => {
    const nextMessage = RETRY_MESSAGE_EXAMPLES[exampleIndex];
    retryMessageHook.setDraft(nextMessage);
    setExampleIndex((prev) => (prev + 1) % RETRY_MESSAGE_EXAMPLES.length);
  };

  return (
    <AccessGuard>
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI Settings
            </h1>
            <p className="text-slate-600 mt-1">Configure how the AI improvement feature works</p>
          </div>

          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:font-bold">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="upse" className="data-[state=active]:bg-white data-[state=active]:font-bold">
                <FolderTree className="w-4 h-4 mr-2" />
                Project Structure (UPSE)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              <div className="max-w-3xl space-y-6">
                <MaintenanceTools currentUser={currentUser} />
                <PersonalPreferencesForm
                  personalPreferences={personalPrefsHook.draft}
                  setPersonalPreferences={personalPrefsHook.setDraft}
                  onSave={handleSavePersonalPreferences}
                  isSaving={personalPrefsHook.isSaving}
                  isDirty={personalPrefsHook.isDirty}
                  defaultExample={DEFAULT_PERSONAL_PREFERENCES}
                />
                <TierAdvisorToggles onDirtyChange={(isDirty) => {
                  // TierAdvisor toggles contribute to AIBackoffice dirty state
                  if (isDirty) {
                    // Force re-render to update save button state
                    setSavedAIValues(prev => ({ ...prev }));
                  }
                }} />
                <Card id="retry-message">
                  <CardHeader>
                    <CardTitle className="text-lg">Retry Task Message</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      This message is automatically added when a task is marked as failed and sent back to Multi-Task for retry.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={retryMessageHook.draft}
                      onChange={(e) => retryMessageHook.setDraft(e.target.value)}
                      className="min-h-[120px] font-mono text-sm"
                      placeholder={DEFAULT_RETRY_MESSAGE}
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveRetryMessage} 
                        disabled={retryMessageHook.isSaving || !retryMessageHook.isDirty} 
                        className="bg-indigo-600"
                      >
                        {retryMessageHook.isSaving ? "Saving..." : "Save Retry Message"}
                      </Button>
                      <Button onClick={handleLoadExample} variant="outline">
                        Load example
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <AIContextToggle
                  enableContextSuggestions={enableContextSuggestions}
                  setEnableContextSuggestions={setEnableContextSuggestions}
                />
                <AIInstructionForm
                  instruction={instruction}
                  setInstruction={setInstruction}
                  modelPreference={modelPreference}
                  setModelPreference={setModelPreference}
                  onSave={handleSave}
                  isSaving={isSavingAI}
                  isDirty={
                    instruction !== savedAIValues.instruction ||
                    modelPreference !== savedAIValues.modelPreference ||
                    enableContextSuggestions !== savedAIValues.enableContextSuggestions
                  }
                  onReset={() => setInstruction(getDefaultInstruction())}
                />
              </div>
            </TabsContent>

            <TabsContent value="upse">
              <UPSEPanel
                projects={projects}
                currentStructure={currentProjectStructure}
                onStructureUpdate={(data) => structureMutation.mutate(data)}
                selectedProjectId={selectedProjectId}
                onProjectSelect={setSelectedProjectId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AccessGuard>
  );
}