import { useState, useEffect } from "react";
// (personalPrefsHook / retryMessageHook below) — auth otherwise stays on useAuth().
import * as aiSettings from "@/api/aiSettings";
import * as projectsApi from "@/api/projects";
import * as projectStructuresApi from "@/api/projectStructures";
import * as learnedPatternsApi from "@/api/learnedPatterns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FolderTree, Settings } from "lucide-react";
import { useAutosaveField } from "@/components/hooks/useAutosaveField";
import { useReliableSaveButton } from "@/components/hooks/useReliableSaveButton";
import { useAuth } from "@/lib/AuthContext";
import { retryTask } from "@/lib/prompts";
import { configureNous, isNousConfigured, DEFAULT_TEXT_MODEL, DEFAULT_VISION_MODEL } from "@/lib/nousClient";
import UPSEPanel from "../components/upse/UPSEPanel";
import MaintenanceTools from "../components/settings/MaintenanceTools";
import AIInstructionForm from "../components/settings/AIInstructionForm";
import PersonalPreferencesForm from "../components/settings/PersonalPreferencesForm";
import AIContextToggle from "../components/settings/AIContextToggle";
import FeedbackInsights from "../components/settings/FeedbackInsights";
import LearnedPatternsPanel from "../components/learning/LearnedPatternsPanel";
import ResearchDocumentation from "../components/settings/ResearchDocumentation";
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

const DEFAULT_RETRY_MESSAGE = retryTask();

// Retry message examples for "Load example" button cycling. All four were
// byte-identical to DEFAULT_RETRY_MESSAGE, so all four now come from the
// same retryTask() builder (see src/lib/prompts.js).
const RETRY_MESSAGE_EXAMPLES = [retryTask(), retryTask(), retryTask()];

export default function AIBackoffice() {
  const queryClient = useQueryClient();
  const [modelPreference, setModelPreference] = useState("default");
  const [enableContextSuggestions, setEnableContextSuggestions] = useState(true);
  const [enableVerbalizedSampling, setEnableVerbalizedSampling] = useState(false);
  const [enableReasoningTransparency, setEnableReasoningTransparency] = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [nousKeyDraft, setNousKeyDraft] = useState("");
  const [nousKeyRevealed, setNousKeyRevealed] = useState(false);
  const [nousTextModel, setNousTextModel] = useState("");
  const [nousVisionModel, setNousVisionModel] = useState("");
  const [hasNousKey, setHasNousKey] = useState(false);
  const [nousKeySuffix, setNousKeySuffix] = useState("");
  const [isSavingNous, setIsSavingNous] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [savedAIValues, setSavedAIValues] = useState({
    instruction: "",
    modelPreference: "default",
    enableContextSuggestions: true
  });

  // Single source of truth for the logged-in user (see src/lib/AuthContext.jsx)
  const { currentUser, refreshUser, updateMe } = useAuth();

  // AISettings failure surfaces via the global query error toast; page still renders with defaults
  const { data: settings = [] } = aiSettings.useList();

  const { data: projects = [] } = projectsApi.useList();

  const { data: projectStructures = [] } = projectStructuresApi.useList();

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const currentProjectStructure = projectStructures.find(ps => ps.project_id === selectedProjectId);

  // Load learned patterns for selected project
  const { data: learnedPatterns = [] } = learnedPatternsApi.useByProject(selectedProjectId);

  const structureMutation = useMutation({
    mutationFn: async (data) => {
      const existing = projectStructures.find(ps => ps.project_id === data.project_id);
      if (existing) {
        return projectStructuresApi.update(existing.id, data);
      } else {
        return projectStructuresApi.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectStructuresApi.keys.all });
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
      await updateMe({ personal_preferences_markdown: draft });
      return { success: true };
    },
  });

  const retryMessageHook = useReliableSaveButton({
    storageKey: `promptster:retryMessage:${currentUser?.id ?? 'anon'}`,
    initialValue: currentUser?.retry_task_message || DEFAULT_RETRY_MESSAGE,
    mutationFn: async (draft) => {
      await updateMe({ retry_task_message: draft });
      return { success: true };
    },
  });

  useEffect(() => {
    if (settings.length > 0 && !settingsId) {
      const dbInstruction = settings[0].improve_prompt_instruction;
      const dbModelPref = settings[0].model_preference || "default";
      const dbContextSuggestions = settings[0].enable_context_suggestions !== false;
      const dbVerbalizedSampling = settings[0].enable_verbalized_sampling || false;
      const dbReasoningTransparency = settings[0].enable_reasoning_transparency || false;

      if (dbInstruction) setInstruction(dbInstruction);
      setModelPreference(dbModelPref);
      setEnableContextSuggestions(dbContextSuggestions);
      setEnableVerbalizedSampling(dbVerbalizedSampling);
      setEnableReasoningTransparency(dbReasoningTransparency);
      setSettingsId(settings[0].id);

      // Nous Research settings — the key itself never lands in state as
      // plain text unless the user explicitly types a new one; we only keep
      // its last 4 chars around to render "ingesteld (eindigt op ...1234)".
      const dbNousKey = settings[0].nous_api_key || "";
      setHasNousKey(!!dbNousKey);
      setNousKeySuffix(dbNousKey.slice(-4));
      setNousTextModel(settings[0].nous_text_model || "");
      setNousVisionModel(settings[0].nous_vision_model || "");

      // Set saved values for dirty tracking
      setSavedAIValues({
        instruction: dbInstruction || getDefaultInstruction(),
        modelPreference: dbModelPref,
        enableContextSuggestions: dbContextSuggestions,
        enableVerbalizedSampling: dbVerbalizedSampling,
        enableReasoningTransparency: dbReasoningTransparency
      });
    }
  }, [settings, settingsId]);

  // Centralized dirty state calculation
  const isAIDirty = 
    instruction !== savedAIValues.instruction ||
    modelPreference !== savedAIValues.modelPreference ||
    enableContextSuggestions !== savedAIValues.enableContextSuggestions ||
    enableVerbalizedSampling !== savedAIValues.enableVerbalizedSampling ||
    enableReasoningTransparency !== savedAIValues.enableReasoningTransparency;


  


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
        enable_verbalized_sampling: !!enableVerbalizedSampling,
        enable_reasoning_transparency: !!enableReasoningTransparency,
        created_by: currentUser.email
      };

      let saved;
      if (settingsId) {
        saved = await aiSettings.update(settingsId, payload);
      } else {
        saved = await aiSettings.create(payload);
        setSettingsId(saved.id);
      }

      // Optimistic cache update
      queryClient.setQueryData(aiSettings.keys.list(currentUser.email), (old = []) => {
        const idx = old.findIndex((s) => s.id === saved.id);
        if (idx === -1) return [saved, ...old];
        const next = [...old];
        next[idx] = saved;
        return next;
      });

      // Invalidate for consistency
      queryClient.invalidateQueries({ queryKey: aiSettings.keys.list(currentUser.email) });

      // Update saved values (reset dirty state)
      setSavedAIValues({
        instruction: payload.improve_prompt_instruction,
        modelPreference: payload.model_preference,
        enableContextSuggestions: payload.enable_context_suggestions,
        enableVerbalizedSampling: payload.enable_verbalized_sampling,
        enableReasoningTransparency: payload.enable_reasoning_transparency
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

  const handleSaveNous = async () => {
    // Guard: prevent save if user not loaded yet
    if (!currentUser?.email) {
      toast.error("User not loaded yet");
      return;
    }

    // Guard: prevent double-click / multiple saves in flight
    if (isSavingNous) return;

    setIsSavingNous(true);

    try {
      const trimmedKey = nousKeyDraft.trim();
      const patch = {
        // Required on create (base44/entities/AISettings.jsonc) — fall back
        // to the existing/default instruction so a Nous-only save on a
        // brand-new row doesn't fail schema validation.
        improve_prompt_instruction: (instruction || "").trim() || getDefaultInstruction(),
        nous_text_model: nousTextModel.trim(),
        nous_vision_model: nousVisionModel.trim(),
      };
      // Only touch the stored key when the user actually typed a new one —
      // an empty draft means "leave the existing key alone", not "clear it".
      if (trimmedKey) {
        patch.nous_api_key = trimmedKey;
      }

      const saved = await aiSettings.upsertMine(currentUser.email, patch);
      setSettingsId(saved.id);

      // Optimistic cache update (same pattern as handleSave above)
      queryClient.setQueryData(aiSettings.keys.list(currentUser.email), (old = []) => {
        const idx = old.findIndex((s) => s.id === saved.id);
        if (idx === -1) return [saved, ...old];
        const next = [...old];
        next[idx] = saved;
        return next;
      });
      queryClient.invalidateQueries({ queryKey: aiSettings.keys.list(currentUser.email) });

      // Wire the (possibly new) key into the live client immediately —
      // no reload needed for the next LLM call to pick it up.
      configureNous({
        apiKey: saved.nous_api_key,
        textModel: saved.nous_text_model,
        visionModel: saved.nous_vision_model,
      });

      setHasNousKey(!!saved.nous_api_key);
      setNousKeySuffix((saved.nous_api_key || "").slice(-4));
      setNousKeyDraft("");
      setNousKeyRevealed(false);

      toast.success("Nous Research settings saved");
    } catch (error) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSavingNous(false);
    }
  };

  const handleSavePersonalPreferences = async () => {
    await personalPrefsHook.handleSave();
    if (!personalPrefsHook.error) {
      refreshUser();
      toast.success("Personal preferences saved");
    } else {
      toast.error("Could not save preferences");
    }
  };

  const handleSaveRetryMessage = async () => {
    await retryMessageHook.handleSave();
    if (!retryMessageHook.error) {
      refreshUser();
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Nous Research</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Deze sleutel praat rechtstreeks vanuit je browser met Nous Research — dit Base44-plan
                      heeft geen backend functies meer. De sleutel wordt alleen bij jouw account bewaard.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nous-api-key">API-sleutel</Label>
                      {hasNousKey && !nousKeyRevealed ? (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            ingesteld (eindigt op &hellip;{nousKeySuffix})
                          </span>
                          <Button type="button" variant="outline" size="sm" onClick={() => setNousKeyRevealed(true)}>
                            Wijzigen
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            id="nous-api-key"
                            type="password"
                            autoComplete="off"
                            value={nousKeyDraft}
                            onChange={(e) => setNousKeyDraft(e.target.value)}
                            placeholder="Nous Research API-sleutel"
                          />
                          {hasNousKey && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => { setNousKeyRevealed(false); setNousKeyDraft(""); }}
                            >
                              Annuleren
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nous-text-model">Tekstmodel (optioneel)</Label>
                        <Input
                          id="nous-text-model"
                          value={nousTextModel}
                          onChange={(e) => setNousTextModel(e.target.value)}
                          placeholder={DEFAULT_TEXT_MODEL}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nous-vision-model">Beeldmodel (optioneel)</Label>
                        <Input
                          id="nous-vision-model"
                          value={nousVisionModel}
                          onChange={(e) => setNousVisionModel(e.target.value)}
                          placeholder={DEFAULT_VISION_MODEL}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button onClick={handleSaveNous} disabled={isSavingNous} className="bg-indigo-600">
                        {isSavingNous ? "Opslaan..." : "Opslaan"}
                      </Button>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Status:{" "}
                        {isNousConfigured() ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">actief</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">niet ingesteld</span>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <ResearchDocumentation currentUser={currentUser} />
                <MaintenanceTools currentUser={currentUser} />
                <FeedbackInsights currentUser={currentUser} />
                <LearnedPatternsPanel projectId={selectedProjectId} />
                <PersonalPreferencesForm
                  personalPreferences={personalPrefsHook.draft}
                  setPersonalPreferences={personalPrefsHook.setDraft}
                  onSave={handleSavePersonalPreferences}
                  isSaving={personalPrefsHook.isSaving}
                  isDirty={personalPrefsHook.isDirty}
                  defaultExample={DEFAULT_PERSONAL_PREFERENCES}
                />
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Advanced AI Features</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Experimental features gebaseerd op recente AI research
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center h-6">
                        <input
                          type="checkbox"
                          checked={enableVerbalizedSampling}
                          onChange={(e) => setEnableVerbalizedSampling(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="font-semibold text-slate-900 dark:text-slate-100 cursor-pointer block mb-1">
                          Verbalized Sampling (Diversiteit +60-110%)
                        </label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Genereert meerdere diverse antwoorden met waarschijnlijkheden. Vermindert "mode collapse" en verhoogt creativiteit.
                          <br />
                          <span className="text-xs italic">Based on: arXiv:2510.01171</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center h-6">
                        <input
                          type="checkbox"
                          checked={enableReasoningTransparency}
                          onChange={(e) => setEnableReasoningTransparency(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="font-semibold text-slate-900 dark:text-slate-100 cursor-pointer block mb-1">
                          AI Reasoning Transparency
                        </label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Toont hoe de AI jouw thoughts interpreteert en waarom bepaalde keuzes worden gemaakt. Helpt bij leren en optimalisatie.
                          <br />
                          <span className="text-xs italic">Based on: arXiv:2601.12538 (Agentic Reasoning)</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <AIInstructionForm
                  instruction={instruction}
                  setInstruction={setInstruction}
                  modelPreference={modelPreference}
                  setModelPreference={setModelPreference}
                  onSave={handleSave}
                  isSaving={isSavingAI}
                  isDirty={isAIDirty}
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
  );
}