import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Sparkles, User, FileText, Lightbulb } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { createPageUrl } from "@/utils";
import { useLanguage } from "../components/i18n/LanguageContext";
import LanguageSelector from "../components/settings/LanguageSelector";
import RequireSubscription from "../components/auth/RequireSubscription";

const getDefaultInstruction = (t) => t("defaultAIInstruction") || `Verbeter de volgende prompt technisch en taalkundig. Maak de tekst professioneler, duidelijker en beter gestructureerd. Behoud de originele intentie en inhoud, maar verbeter grammatica, spelling, en technische precisie. Geef alleen de verbeterde tekst terug, geen uitleg.`;

const DEFAULT_PERSONAL_PREFERENCES = `# Mijn Persoonlijke Development Voorkeuren

## Code Stijl
- Naming: camelCase voor variabelen, PascalCase voor componenten
- Async: Altijd async/await, nooit promise chains
- Error handling: Try-catch rond alle async operations
- Comments: JSDoc voor functies, inline voor complexe logica

## UI/UX Filosofie
- Design: Minimalistisch, focus op usability
- Icons: Lucide React (eerste keuze)
- Responsiveness: Mobile-first aanpak
- Accessibility: WCAG 2.1 AA minimum

## Testing & Validatie
- Coverage target: 80% voor kritische paden
- Edge cases: Altijd minimaal 3 edge cases per feature

## Taak Structuur
- Prioriteit labels: Kritisch/Hoog/Medium/Laag
- Taak format: Wat/Waar/Waarom structuur
`;

export default function AIBackoffice() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [instruction, setInstruction] = useState("");
  const [modelPreference, setModelPreference] = useState("default");
  const [enableContextSuggestions, setEnableContextSuggestions] = useState(true);
  const [settingsId, setSettingsId] = useState(null);
  const [personalPreferences, setPersonalPreferences] = useState("");
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

  useEffect(() => {
    if (settings.length > 0) {
      setInstruction(settings[0].improve_prompt_instruction || getDefaultInstruction(t));
      setModelPreference(settings[0].model_preference || "default");
      setEnableContextSuggestions(settings[0].enable_context_suggestions !== false);
      setSettingsId(settings[0].id);
    } else {
      setInstruction(getDefaultInstruction(t));
    }
  }, [settings, t]);

  // Load autosaved or user data
  useEffect(() => {
    if (currentUser?.id) {
      // Load instruction
      const savedInstruction = localStorage.getItem(`ai_instruction_${currentUser.id}`);
      if (savedInstruction) setInstruction(savedInstruction);

      // Load preferences
      const savedPrefs = localStorage.getItem(`ai_prefs_${currentUser.id}`);
      if (savedPrefs) {
        setPersonalPreferences(savedPrefs);
      } else if (currentUser?.personal_preferences_markdown) {
        setPersonalPreferences(currentUser.personal_preferences_markdown);
      }
    }
  }, [currentUser]);

  // Autosave instruction
  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(`ai_instruction_${currentUser.id}`, instruction);
    }
  }, [instruction, currentUser?.id]);

  // Autosave preferences
  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(`ai_prefs_${currentUser.id}`, personalPreferences);
    }
  }, [personalPreferences, currentUser?.id]);

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
      toast.success(t("aiSettingsSaved") || "AI instellingen opgeslagen");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      improve_prompt_instruction: instruction,
      model_preference: modelPreference,
      enable_context_suggestions: enableContextSuggestions
    });
  };

  const handleSavePersonalPreferences = async () => {
    setIsSavingPreferences(true);
    try {
      await base44.auth.updateMe({ personal_preferences_markdown: personalPreferences });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success(t("preferencesSaved") || "Persoonlijke voorkeuren opgeslagen");
    } catch (error) {
      toast.error(t("preferencesSaveFailed") || "Kon voorkeuren niet opslaan");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <RequireSubscription>
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {t("aiSettings")}
          </h1>
          <p className="text-slate-600 mt-1">{t("configureAI")}</p>
        </div>

        {/* Language Selection Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("languageSelection")}</CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageSelector />
          </CardContent>
        </Card>

        {/* Personal Preferences Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              {t("personalPreferences")}
            </CardTitle>
            <CardDescription>
              {t("personalPreferencesDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("preferencesMarkdown")}</Label>
              <Textarea
                value={personalPreferences}
                onChange={(e) => setPersonalPreferences(e.target.value)}
                placeholder="# Mijn Persoonlijke Voorkeuren&#10;&#10;## Code Stijl&#10;- Naming: camelCase..."
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                {t("preferencesHelp")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSavePersonalPreferences} 
                disabled={isSavingPreferences}
                className="bg-blue-600 hover:bg-blue-700"
                title={t("savePreferences")}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingPreferences ? t("saving") : t("savePreferences")}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPersonalPreferences(DEFAULT_PERSONAL_PREFERENCES)}
                title={t("loadExample")}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t("loadExample")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Context Suggestions Toggle */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              {t("aiContextSuggestions")}
            </CardTitle>
            <CardDescription>
              {t("aiContextSuggestionsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("enableAISuggestions")}</p>
                <p className="text-xs text-slate-500">{t("enableAISuggestionsDesc")}</p>
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
              {t("improveWithAI")} - {t("aiInstruction")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t("aiInstruction")}</Label>
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Instructie voor de AI..."
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                {t("aiInstructionDesc")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("modelPreference")}</Label>
              <Select value={modelPreference} onValueChange={setModelPreference}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("standard")}</SelectItem>
                  <SelectItem value="creative">{t("creative")}</SelectItem>
                  <SelectItem value="precise">{t("precise")}</SelectItem>
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
                {saveMutation.isPending ? (t("saving") || "Opslaan...") : t("save")}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setInstruction(getDefaultInstruction(t))}
              >
                {t("resetToDefault")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </RequireSubscription>
  );
}