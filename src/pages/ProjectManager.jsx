import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, Trash2, Plus, FolderOpen } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const projectColors = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500"
};

const DEFAULT_CONFIG = `# Project Configuratie

## Technische Context
- Platform: Base44
- Framework: React + Tailwind CSS
- Componenten: shadcn/ui
- Icons: Lucide React

## Bestandsstructuur
- pages/ - Pagina componenten
- components/ - Herbruikbare componenten
- entities/ - Data modellen (JSON schema)

## Stijlrichtlijnen
- Kleuren: Gebruik Tailwind klassen (indigo-600, slate-700, etc.)
- Spacing: p-4 voor padding, gap-4 voor flex/grid gaps
- Responsive: mobile-first (sm:, md:, lg: breakpoints)

## Code Conventies
- camelCase voor variabelen
- PascalCase voor componenten
- async/await voor async operaties`;

export default function ProjectManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(location.search);
  const projectId = urlParams.get("id");
  const isNewProject = !projectId;

  const [formData, setFormData] = useState({
    name: "",
    color: "blue",
    description: "",
    technical_config_markdown: ""
  });

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.get(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        color: project.color || "blue",
        description: project.description || "",
        technical_config_markdown: project.technical_config_markdown || ""
      });
    }
  }, [project]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isNewProject) {
        return base44.entities.Project.create(data);
      } else {
        return base44.entities.Project.update(projectId, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success(isNewProject ? "Project aangemaakt!" : "Project opgeslagen!");
      navigate(createPageUrl("Multiprompt"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Project.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success("Project verwijderd");
      navigate(createPageUrl("Multiprompt"));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Projectnaam is verplicht");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading && !isNewProject) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Multiprompt"))}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <FolderOpen className="w-8 h-8 text-indigo-600" />
                {isNewProject ? "Nieuw Project" : "Project Bewerken"}
              </h1>
              <p className="text-slate-600 mt-1">
                {isNewProject ? "Maak een nieuw Promptguard project" : `Bewerk ${project?.name || 'project'}`}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Projectnaam *</Label>
                <Input
                  id="name"
                  placeholder="Bijv: PilPall, Fixon, AtlasGPT..."
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="border-slate-200 text-lg"
                  required
                />
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <Label>Kleur</Label>
                <div className="flex gap-3 flex-wrap">
                  {Object.keys(projectColors).map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleInputChange("color", color)}
                      className={`w-10 h-10 rounded-full ${projectColors[color]} transition-all ${
                        formData.color === color 
                          ? 'ring-4 ring-offset-2 ring-slate-400 scale-110' 
                          : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Beschrijving (optioneel)</Label>
                <Textarea
                  id="description"
                  placeholder="Korte beschrijving van dit project..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="min-h-[100px] border-slate-200"
                />
              </div>

              {/* Technical Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="config">Technische Configuratie (Markdown)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange("technical_config_markdown", DEFAULT_CONFIG)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Voorbeeld
                  </Button>
                </div>
                <Textarea
                  id="config"
                  placeholder="# Project Configuratie&#10;&#10;## Technische Context&#10;- Platform: ...&#10;- Framework: ..."
                  value={formData.technical_config_markdown}
                  onChange={(e) => handleInputChange("technical_config_markdown", e.target.value)}
                  className="min-h-[300px] font-mono text-sm border-slate-200"
                />
                <p className="text-xs text-slate-500">
                  Definieer hier project-specifieke configuratie zoals bestandsstructuur, kleuren, API endpoints, etc.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6">
            <div>
              {!isNewProject && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Verwijderen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Project verwijderen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Weet je zeker dat je "{project?.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Verwijderen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl("Multiprompt"))}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saveMutation.isPending ? (
                  "Opslaan..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Opslaan
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}