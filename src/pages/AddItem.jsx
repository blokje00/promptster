import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, X, Star, GitBranch } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUploadZone from "../components/dashboard/ImageUploadZone";
import ZipUploadZone from "../components/dashboard/ZipUploadZone";

export default function AddItem() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: "",
    type: "prompt",
    content: "",
    language: "javascript",
    description: "",
    tags: [],
    is_favorite: false,
    notes: "",
    images: [],
    zip_files: [],
    is_publish_version: false,
    publish_timestamp: "",
    publish_working_notes: "",
    publish_reason: ""
  });
  
  const [tagInput, setTagInput] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      navigate(createPageUrl("Dashboard"));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Nieuw Item Toevoegen
              </h1>
              <p className="text-slate-600 mt-1">Voeg een nieuwe prompt of code snippet toe</p>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    placeholder="Bijv: React useEffect Hook"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({...formData, type: value})}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prompt">Prompt</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="snippet">Snippet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.type === "code" || formData.type === "snippet") && (
                <div className="space-y-2">
                  <Label htmlFor="language">Taal</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({...formData, language: value})}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="css">CSS</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="sql">SQL</SelectItem>
                      <SelectItem value="bash">Bash</SelectItem>
                      <SelectItem value="other">Anders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Beschrijving</Label>
                <Input
                  id="description"
                  placeholder="Korte beschrijving van dit item"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Inhoud *</Label>
                <Textarea
                  id="content"
                  placeholder="Plak hier je code of prompt..."
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  required
                  className="min-h-[300px] font-mono text-sm border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notities</Label>
                <Textarea
                  id="notes"
                  placeholder="Voeg persoonlijke notities toe..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="min-h-[100px] border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label>Screenshots & Afbeeldingen</Label>
                <ImageUploadZone
                  images={formData.images}
                  onImagesChange={(newImages) => setFormData({...formData, images: newImages})}
                />
              </div>

              <div className="space-y-2">
                <Label>ZIP Bestanden (Code)</Label>
                <ZipUploadZone
                  zipFiles={formData.zip_files}
                  onZipFilesChange={(newZipFiles) => setFormData({...formData, zip_files: newZipFiles})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Voeg een tag toe..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="border-slate-200"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Toevoegen
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={formData.is_favorite ? "default" : "outline"}
                  onClick={() => setFormData({...formData, is_favorite: !formData.is_favorite})}
                  className={formData.is_favorite ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                >
                  <Star className={`w-4 h-4 mr-2 ${formData.is_favorite ? 'fill-white' : ''}`} />
                  {formData.is_favorite ? 'Favoriet' : 'Markeer als favoriet'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-slate-200 mt-6">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-green-600" />
                Publish Versie
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_publish"
                  checked={formData.is_publish_version}
                  onCheckedChange={(checked) => {
                    const now = new Date();
                    const timestamp = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setFormData({
                      ...formData, 
                      is_publish_version: checked,
                      publish_timestamp: checked ? timestamp : formData.publish_timestamp
                    });
                  }}
                />
                <label
                  htmlFor="is_publish"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Dit is een Publish versie / stabiele timestamp
                </label>
              </div>

              {formData.is_publish_version && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="publish_timestamp">Datum/Tijd Publish</Label>
                    <Input
                      id="publish_timestamp"
                      type="datetime-local"
                      value={formData.publish_timestamp}
                      onChange={(e) => setFormData({...formData, publish_timestamp: e.target.value})}
                      className="border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publish_working_notes">Wat werkte er allemaal goed?</Label>
                    <Textarea
                      id="publish_working_notes"
                      placeholder="Beschrijf wat er op dit moment allemaal goed werkte..."
                      value={formData.publish_working_notes}
                      onChange={(e) => setFormData({...formData, publish_working_notes: e.target.value})}
                      className="min-h-[100px] border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publish_reason">Waarom deze Publish versie?</Label>
                    <Textarea
                      id="publish_reason"
                      placeholder="Leg uit waarom je deze Publish versie maakt (bijv. voor een grote wijziging)..."
                      value={formData.publish_reason}
                      onChange={(e) => setFormData({...formData, publish_reason: e.target.value})}
                      className="min-h-[100px] border-slate-200"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Dashboard"))}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}