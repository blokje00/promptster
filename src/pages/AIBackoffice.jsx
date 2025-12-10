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
import UPSEPanel from "../components/upse/UPSEPanel";
import MaintenanceTools from "../components/settings/MaintenanceTools";
import AIInstructionForm from "../components/settings/AIInstructionForm";
import PersonalPreferencesForm from "../components/settings/PersonalPreferencesForm";
import AIContextToggle from "../components/settings/AIContextToggle";
import { toast } from "sonner";

const getDefaultInstruction = () => `Improve the following prompt technically and linguistically. Make the text more professional, clearer, and better structured. Preserve the original intent and content, but improve grammar, spelling, and technical precision. Only return the improved text, no explanation.`;

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

const DEFAULT_RETRY_MESSAGE = `This task was previously executed but not approved by the user. There are missing elements, the function doesn't work, or is invisible. Analyze again and apply improvements.`;

// Retry message examples for "Load example" button cycling
const RETRY_MESSAGE_EXAMPLES = [
  "This task was previously executed but not approved by the user. Important elements are missing or incorrect. Carefully review the original instructions and deliver a complete, fully working solution.",
  "The earlier execution of this task did not fully match the requested behavior. Some parts are missing, broken, or not visible. Re-check the full context and provide a robust, end-to-end implementation that covers all requirements.",
  "This task was executed earlier but did not meet the required standards. Critical elements were missing, incorrect, non-functional, or not visible to the user. Re-analyze the original instructions thoroughly and deliver a fully correct, complete, operational, and clearly visible solution with no omissions."
];

export default function AIBackoffice() {
  const queryClient = useQueryClient();
  const [modelPreference, setModelPreference] = useState("default");
  const [enableContextSuggestions, setEnableContextSuggestions] = useState(true);
  const [settingsId, setSettingsId] = useState(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSavingRetryMessage, setIsSavingRetryMessage] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);

  const { data: settings = [] } = useQuery({
    queryKey: ['aiSettings'],
    queryFn: async () => await base44.entities.AISettings.list() || [],
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => await base44.auth.me(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Project.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email,
  });

  const { data: projectStructures = [] } = useQuery({
    queryKey: ['projectStructures', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.ProjectStructure.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email,
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

  const { value: personalPreferences, setValue: setPersonalPreferences, resetValue: resetPersonalPreferences } = useAutosaveField({
    storageKey: `promptster:aibackoffice:personalPrefs:${currentUser?.id ?? 'anon'}`,
    initialValue: currentUser?.personal_preferences_markdown || "",
    enabled: !!currentUser?.id,
  });

  const { value: retryMessage, setValue: setRetryMessage, resetValue: resetRetryMessage } = useAutosaveField({
    storageKey: `promptster:aibackoffice:retryMessage:${currentUser?.id ?? 'anon'}`,
    initialValue: currentUser?.retry_task_message || DEFAULT_RETRY_MESSAGE,
    enabled: !!currentUser?.id,
  });

  useEffect(() => {
    if (settings.length > 0 && !settingsId) {
      const dbInstruction = settings[0].improve_prompt_instruction;
      if (dbInstruction) setInstruction(dbInstruction);
      setModelPreference(settings[0].model_preference || "default");
      setEnableContextSuggestions(settings[0].enable_context_suggestions !== false);
      setSettingsId(settings[0].id);
    }
  }, [settings, settingsId]);

  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [retryMsgLoaded, setRetryMsgLoaded] = useState(false);
  
  useEffect(() => {
    if (currentUser?.personal_preferences_markdown && !prefsLoaded) {
      setPersonalPreferences(currentUser.personal_preferences_markdown);
      setPrefsLoaded(true);
    }
  }, [currentUser, prefsLoaded]);

  useEffect(() => {
    if (currentUser?.retry_task_message && !retryMsgLoaded) {
      setRetryMessage(currentUser.retry_task_message);
      setRetryMsgLoaded(true);
    }
  }, [currentUser, retryMsgLoaded]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settingsId) {
        return base44.entities.AISettings.update(settingsId, data);
      } else {
        return base44.entities.AISettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiSettings'] });
      toast.success("AI settings saved");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      improve_prompt_instruction: instruction,
      model_preference: modelPreference,
      enable_context_suggestions: enableContextSuggestions
    });
    resetInstruction();
  };

  const handleSavePersonalPreferences = async () => {
    setIsSavingPreferences(true);
    try {
      await base44.auth.updateMe({ personal_preferences_markdown: personalPreferences });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Personal preferences saved");
      resetPersonalPreferences();
    } catch (error) {
      toast.error("Could not save preferences");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleSaveRetryMessage = async () => {
    setIsSavingRetryMessage(true);
    try {
      await base44.auth.updateMe({ retry_task_message: retryMessage });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Retry task message saved");
      resetRetryMessage();
    } catch (error) {
      toast.error("Could not save retry message");
    } finally {
      setIsSavingRetryMessage(false);
    }
  };

  // Load next example retry message (cycles through RETRY_MESSAGE_EXAMPLES)
  const handleLoadExample = () => {
    const nextMessage = RETRY_MESSAGE_EXAMPLES[exampleIndex];
    setRetryMessage(nextMessage);
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
                  personalPreferences={personalPreferences}
                  setPersonalPreferences={setPersonalPreferences}
                  onSave={handleSavePersonalPreferences}
                  isSaving={isSavingPreferences}
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
                      value={retryMessage}
                      onChange={(e) => setRetryMessage(e.target.value)}
                      className="min-h-[120px] font-mono text-sm"
                      placeholder={DEFAULT_RETRY_MESSAGE}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveRetryMessage} disabled={isSavingRetryMessage} className="bg-indigo-600">
                        {isSavingRetryMessage ? "Saving..." : "Save Retry Message"}
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
                  isSaving={saveMutation.isPending}
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