import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, 
  Lightbulb, 
  Layers, 
  Save, 
  Trash2, 
  Copy, 
  CheckCircle,
  FileText,
  ArrowRight,
  X
} from "lucide-react";

export default function Multiprompt() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newThought, setNewThought] = useState("");
  const [selectedThoughts, setSelectedThoughts] = useState([]);
  const [startTemplateId, setStartTemplateId] = useState("");
  const [endTemplateId, setEndTemplateId] = useState("");
  const [promptTitle, setPromptTitle] = useState("");
  const [copied, setCopied] = useState(false);

  // Template form state
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState("start");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  const { data: thoughts = [] } = useQuery({
    queryKey: ['thoughts'],
    queryFn: () => base44.entities.Thought.list("-created_date"),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.PromptTemplate.list(),
  });

  const createThoughtMutation = useMutation({
    mutationFn: (data) => base44.entities.Thought.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      setNewThought("");
      toast.success("Gedachte toegevoegd");
    },
  });

  const deleteThoughtMutation = useMutation({
    mutationFn: (id) => base44.entities.Thought.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast.success("Gedachte verwijderd");
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.PromptTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setNewTemplateName("");
      setNewTemplateContent("");
      toast.success("Template opgeslagen");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.PromptTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success("Template verwijderd");
    },
  });

  const createMultipromptMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.create(data),
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success("Multiprompt opgeslagen!");
      navigate(createPageUrl(`ViewItem?id=${newItem.id}`));
    },
  });

  const handleAddThought = () => {
    if (!newThought.trim()) return;
    createThoughtMutation.mutate({ content: newThought.trim() });
  };

  const handleAddTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
    createTemplateMutation.mutate({
      name: newTemplateName.trim(),
      type: newTemplateType,
      content: newTemplateContent.trim()
    });
  };

  const toggleThoughtSelection = (thoughtId) => {
    setSelectedThoughts(prev => 
      prev.includes(thoughtId) 
        ? prev.filter(id => id !== thoughtId)
        : [...prev, thoughtId]
    );
  };

  const startTemplates = templates.filter(t => t.type === "start");
  const endTemplates = templates.filter(t => t.type === "eind");

  const selectedStartTemplate = templates.find(t => t.id === startTemplateId);
  const selectedEndTemplate = templates.find(t => t.id === endTemplateId);
  const selectedThoughtContents = thoughts
    .filter(t => selectedThoughts.includes(t.id))
    .map(t => t.content);

  const generatedPrompt = [
    selectedStartTemplate?.content || "",
    ...selectedThoughtContents,
    selectedEndTemplate?.content || ""
  ].filter(Boolean).join("\n\n");

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success("Prompt gekopieerd!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMultiprompt = () => {
    if (!promptTitle.trim()) {
      toast.error("Geef de multiprompt een titel");
      return;
    }
    if (!generatedPrompt.trim()) {
      toast.error("De prompt is leeg");
      return;
    }

    createMultipromptMutation.mutate({
      title: promptTitle.trim(),
      type: "multiprompt",
      content: generatedPrompt,
      used_thoughts: selectedThoughts,
      start_template_id: startTemplateId || null,
      end_template_id: endTemplateId || null
    });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Multiprompt Builder
          </h1>
          <p className="text-slate-600 mt-2">Verzamel gedachten en bouw uitgebreide prompts</p>
        </div>

        <Tabs defaultValue="build" className="space-y-6">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="build" className="data-[state=active]:bg-white">
              <Layers className="w-4 h-4 mr-2" />
              Bouw Prompt
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Thoughts */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Gedachten
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Typ een gedachte of idee..."
                        value={newThought}
                        onChange={(e) => setNewThought(e.target.value)}
                        className="min-h-[80px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleAddThought();
                          }
                        }}
                      />
                    </div>
                    <Button 
                      onClick={handleAddThought} 
                      disabled={!newThought.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Gedachte Toevoegen
                    </Button>

                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {thoughts.map((thought) => (
                        <div 
                          key={thought.id}
                          className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            selectedThoughts.includes(thought.id)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => toggleThoughtSelection(thought.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox 
                              checked={selectedThoughts.includes(thought.id)}
                              onCheckedChange={() => toggleThoughtSelection(thought.id)}
                            />
                            <p className="flex-1 text-sm text-slate-700 whitespace-pre-wrap">
                              {thought.content}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteThoughtMutation.mutate(thought.id);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {thoughts.length === 0 && (
                        <p className="text-center text-slate-400 py-8">
                          Nog geen gedachten. Begin met typen!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Preview & Actions */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Prompt Samenstellen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Starttekst
                        </label>
                        <Select value={startTemplateId} onValueChange={setStartTemplateId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Kies starttekst..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>Geen</SelectItem>
                            {startTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Eindtekst
                        </label>
                        <Select value={endTemplateId} onValueChange={setEndTemplateId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Kies eindtekst..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>Geen</SelectItem>
                            {endTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Geselecteerd: {selectedThoughts.length} gedachten
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {selectedThoughts.map((id, idx) => (
                          <Badge key={id} variant="secondary" className="text-xs">
                            #{idx + 1}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span>Preview</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPrompt}
                        disabled={!generatedPrompt}
                      >
                        {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? "Gekopieerd" : "Kopieer"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-900 rounded-xl p-4 max-h-[300px] overflow-auto">
                      <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                        {generatedPrompt || "Selecteer gedachten en templates om een preview te zien..."}
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Input
                      placeholder="Titel voor deze multiprompt..."
                      value={promptTitle}
                      onChange={(e) => setPromptTitle(e.target.value)}
                    />
                    <Button
                      onClick={handleSaveMultiprompt}
                      disabled={!generatedPrompt || !promptTitle.trim()}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Opslaan als Multiprompt
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Add Template Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Nieuwe Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Template naam..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                  <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="start">Starttekst</SelectItem>
                      <SelectItem value="eind">Eindtekst</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Template inhoud..."
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    className="min-h-[150px]"
                  />
                  <Button
                    onClick={handleAddTemplate}
                    disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Template Opslaan
                  </Button>
                </CardContent>
              </Card>

              {/* Templates List */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-green-700">Startteksten</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {startTemplates.map(template => (
                      <div key={template.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-green-800">{template.name}</p>
                            <p className="text-sm text-green-600 mt-1 line-clamp-2">{template.content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {startTemplates.length === 0 && (
                      <p className="text-slate-400 text-center py-4">Geen startteksten</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-orange-700">Eindteksten</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {endTemplates.map(template => (
                      <div key={template.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-orange-800">{template.name}</p>
                            <p className="text-sm text-orange-600 mt-1 line-clamp-2">{template.content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {endTemplates.length === 0 && (
                      <p className="text-slate-400 text-center py-4">Geen eindteksten</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}