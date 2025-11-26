import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const DEFAULT_INSTRUCTION = `Verbeter de volgende prompt technisch en taalkundig. Maak de tekst professioneler, duidelijker en beter gestructureerd. Behoud de originele intentie en inhoud, maar verbeter grammatica, spelling, en technische precisie. Geef alleen de verbeterde tekst terug, geen uitleg.`;

export default function AIBackoffice() {
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState(DEFAULT_INSTRUCTION);
  const [modelPreference, setModelPreference] = useState("default");
  const [settingsId, setSettingsId] = useState(null);

  const { data: settings = [] } = useQuery({
    queryKey: ['aiSettings'],
    queryFn: () => base44.entities.AISettings.filter({}),
  });

  useEffect(() => {
    if (settings.length > 0) {
      setInstruction(settings[0].improve_prompt_instruction || DEFAULT_INSTRUCTION);
      setModelPreference(settings[0].model_preference || "default");
      setSettingsId(settings[0].id);
    }
  }, [settings]);

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
      toast.success("AI instellingen opgeslagen");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      improve_prompt_instruction: instruction,
      model_preference: modelPreference
    });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Multiprompt")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI Instellingen
            </h1>
            <p className="text-slate-600 mt-1">Configureer hoe de AI verbeter functie werkt</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Verbeter met AI - Instructie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>AI Instructie</Label>
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Instructie voor de AI..."
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Deze instructie wordt gebruikt wanneer je op "Verbeter met AI" klikt. 
                De originele prompt wordt automatisch toegevoegd.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Model Voorkeur</Label>
              <Select value={modelPreference} onValueChange={setModelPreference}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Standaard</SelectItem>
                  <SelectItem value="creative">Creatief (meer variatie)</SelectItem>
                  <SelectItem value="precise">Precies (conservatief)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setInstruction(DEFAULT_INSTRUCTION)}
              >
                Reset naar standaard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}