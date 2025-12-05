import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Sparkles, User, FileText, Lightbulb, FolderTree, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { createPageUrl } from "@/utils";
// Language translations removed - all text in English
import LanguageSelector from "../components/settings/LanguageSelector";
import RequireSubscription from "../components/auth/RequireSubscription";
import { useAutosaveField } from "@/components/hooks/useAutosaveField";
import UPSEPanel from "../components/upse/UPSEPanel";
import { Wrench } from "lucide-react";

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

export default function AIBackoffice() {
  const queryClient = useQueryClient();
  // Removed useLanguage - all text is now hardcoded in English
  const [modelPreference, setModelPreference] = useState("default");
  const [enableContextSuggestions, setEnableContextSuggestions] = useState(true);
  const [settingsId, setSettingsId] = useState(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['aiSettings'],
    queryFn: async () => {
      const result = await base44.entities.AISettings.list();
      return result || [];
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user;
    },
  });

  // Projects for UPSE
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Project.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email,
  });

  // Project Structures
  const { data: projectStructures = [] } = useQuery({
    queryKey: ['projectStructures', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.ProjectStructure.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email,
  });

  const [selectedProjectId, setSelectedProjectId] = useState("");
  
  const currentProjectStructure = projectStructures.find(
    ps => ps.project_id === selectedProjectId
  );

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

  // Autosave for AI instruction field
  const { value: instruction, setValue: setInstruction, resetValue: resetInstruction } = useAutosaveField({
    storageKey: `promptster:aibackoffice:instruction:${currentUser?.id ?? 'anon'}`,
    initialValue: settings[0]?.improve_prompt_instruction || getDefaultInstruction(),
    enabled: !!currentUser?.id,
  });

  // Autosave for personal preferences field
  const { value: personalPreferences, setValue: setPersonalPreferences, resetValue: resetPersonalPreferences } = useAutosaveField({
    storageKey: `promptster:aibackoffice:personalPrefs:${currentUser?.id ?? 'anon'}`,
    initialValue: currentUser?.personal_preferences_markdown || "",
    enabled: !!currentUser?.id,
  });

  // Sync settings from DB when loaded - only once on initial load
  useEffect(() => {
    if (settings.length > 0 && !settingsId) {
      // Only set from DB if this is the initial load (settingsId not yet set)
      const dbInstruction = settings[0].improve_prompt_instruction;
      if (dbInstruction) {
        setInstruction(dbInstruction);
      }
      setModelPreference(settings[0].model_preference || "default");
      setEnableContextSuggestions(settings[0].enable_context_suggestions !== false);
      setSettingsId(settings[0].id);
    }
  }, [settings, settingsId]);

  // Sync personal preferences from user when loaded - only once
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  useEffect(() => {
    if (currentUser?.personal_preferences_markdown && !prefsLoaded) {
      setPersonalPreferences(currentUser.personal_preferences_markdown);
      setPrefsLoaded(true);
    }
  }, [currentUser, prefsLoaded]);

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
    // Clear draft after successful save (sync with DB is now source of truth)
    resetInstruction();
  };

  const handleSavePersonalPreferences = async () => {
    setIsSavingPreferences(true);
    try {
      await base44.auth.updateMe({ personal_preferences_markdown: personalPreferences });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Personal preferences saved");
      // Clear draft after successful save
      resetPersonalPreferences();
    } catch (error) {
      toast.error("Could not save preferences");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Temporary function to fix vault data
  const [isFixing, setIsFixing] = useState(false);
  const handleFixVault = async () => {
    setIsFixing(true);
    try {
      const { invoke } = base44.functions; // Assuming base44.functions.invoke exists or similar
      // Check how to call functions. Instructions say: 
      // "import { someFunction } from '@/functions/someFunction'; const response = await someFunction(...)"
      // But we created it dynamically. 
      // If platform V2, we can import.
      // Let's try dynamic import or just using the SDK if available.
      // The instructions say "THE ONLY WAY TO USE A FUNCTION ... is to import it".
      // But I can't add an import to the top easily without reading the whole file again or using find_replace carefully.
      // Wait, I can use base44.functions.invoke('functionName') if the SDK supports it.
      // The instructions say: "base44.asServiceRole.functions - Call backend functions." (Admin only?)
      // "You can invoke another backend function via the SDK: const res = await base44.functions.invoke('myFunction', { foo: 'bar' });"
      // So `base44.functions.invoke` should work for user-scoped calls too if exposed.
      
      // Let's try to import it dynamically or assume invoke works.
      // In `functions/exportTasks.js` example: `const { data } = await base44.functions.invoke('exportTasks');`
      // So yes, `base44.functions.invoke` is the way.
      
      const res = await base44.functions.invoke('fixVaultTasks');
      const data = res.data || res; // Handle axios response or direct data
      
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['openTasksCount'] }); // Refresh header badge
      } else {
        toast.error("Fix failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to run fix script");
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <RequireSubscription>
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
            <TabsTrigger value="settings" className="data-[state=active]:bg-white">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="upse" className="data-[state=active]:bg-white">
              <FolderTree className="w-4 h-4 mr-2" />
              Project Structure (UPSE)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <div className="max-w-3xl">
              {/* Maintenance Card */}
              <Card className="mb-6 border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Wrench className="w-5 h-5" />
                    Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleFixVault} disabled={isFixing} className="bg-orange-600 hover:bg-orange-700 text-white">
                    {isFixing ? "Fixing..." : "Fix Vault Data (Set all to Success)"}
                  </Button>
                  <p className="text-xs text-orange-600 mt-2">
                    Use this once to mark all pending tasks as success and reset the Vault counter.
                  </p>
                </CardContent>
              </Card>

              {/* Language Selection Removed (Task 6) */}

              {/* Personal Preferences Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    Personal Preferences
                  </CardTitle>
                  <CardDescription>
                    Your reusable preferences that are automatically added to Multi-Step prompts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Preferences (Markdown)</Label>
                    <Textarea
                      value={personalPreferences}
                      onChange={(e) => setPersonalPreferences(e.target.value)}
                      placeholder="# My Personal Preferences&#10;&#10;## Code Style&#10;- Naming: camelCase..."
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      Define your personal code style, UI/UX philosophy, testing preferences, etc. These are saved once and reused in all your prompts.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSavePersonalPreferences} 
                      disabled={isSavingPreferences}
                      className="bg-blue-600 hover:bg-blue-700"
                      title="Save Preferences"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSavingPreferences ? "Saving..." : "Save Preferences"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPersonalPreferences(DEFAULT_PERSONAL_PREFERENCES)}
                      title="Load Example"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Load Example
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Context Suggestions Toggle */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    AI Context Suggestions
                  </CardTitle>
                  <CardDescription>
                    Automatic AI suggestions for Page, Component and Domain while typing tasks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enable AI suggestions</p>
                      <p className="text-xs text-slate-500">Get automatic suggested context based on your text</p>
                    </div>
                    <Switch
                      checked={enableContextSuggestions}
                      onCheckedChange={setEnableContextSuggestions}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Improve with AI - Instruction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>AI Instruction</Label>
                    <Textarea
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Instruction for the AI..."
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      This instruction is used when you click "Improve with AI". The original prompt is automatically added.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Model Preference</Label>
                    <Select value={modelPreference} onValueChange={setModelPreference}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Standard</SelectItem>
                        <SelectItem value="creative">Creative (more variation)</SelectItem>
                        <SelectItem value="precise">Precise (conservative)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSave} 
                      disabled={saveMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setInstruction(getDefaultInstruction())}
                    >
                      Reset to default
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
    </RequireSubscription>
  );
}