import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, X, Star, GitBranch } from "lucide-react";
import FileChangesFeedback from "../components/items/FileChangesFeedback";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUploadZone from "../components/dashboard/ImageUploadZone";
import ZipUploadZone from "../components/dashboard/ZipUploadZone";

export default function EditItem() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(location.search);
  const itemId = urlParams.get("id");

  const [formData, setFormData] = useState(null);
  const [tagInput, setTagInput] = useState("");

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => base44.entities.Item.get(itemId),
    enabled: !!itemId,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        tags: item.tags || [],
        images: item.images || [],
        zip_files: item.zip_files || [],
        is_publish_version: item.is_publish_version || false,
        publish_timestamp: item.publish_timestamp || "",
        publish_working_notes: item.publish_working_notes || "",
        publish_reason: item.publish_reason || "",
        file_changes_feedback: item.file_changes_feedback || ""
      });
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.update(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item', itemId] });
      navigate(createPageUrl(`ViewItem?id=${itemId}`));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    updateMutation.mutate(updateData);
  };
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
  }

  const addTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag]
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

  if (isLoading || !formData) {
    return <div className="p-8"><Skeleton className="h-screen w-full" /></div>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl(`ViewItem?id=${itemId}`))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Item Bewerken
            </h1>
            <p className="text-slate-600 mt-1">Pas je prompt of code snippet aan</p>
          </div>
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
                  <Input id="title" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input id="description" value={formData.description || ''} onChange={(e) => handleInputChange('description', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Inhoud *</Label>
                <Textarea id="content" value={formData.content} onChange={(e) => handleInputChange('content', e.target.value)} required className="min-h-[300px] font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notities</Label>
                <Textarea id="notes" value={formData.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} className="min-h-[100px]" />
              </div>

              <div className="space-y-2">
                <Label>Screenshots & Afbeeldingen</Label>
                <ImageUploadZone
                  images={formData.images}
                  onImagesChange={(newImages) => handleInputChange('images', newImages)}
                />
              </div>

              <div className="space-y-2">
                <Label>ZIP Bestanden (Code)</Label>
                <ZipUploadZone
                  zipFiles={formData.zip_files}
                  onZipFilesChange={(newZipFiles) => handleInputChange('zip_files', newZipFiles)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input id="tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                  <Button type="button" onClick={addTag} variant="outline">Toevoegen</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="px-3 py-1">{tag}<button type="button" onClick={() => removeTag(tag)} className="ml-2 hover:text-red-500"><X className="w-3 h-3" /></button></Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant={formData.is_favorite ? "default" : "outline"} onClick={() => handleInputChange('is_favorite', !formData.is_favorite)} className={formData.is_favorite ? "bg-yellow-500 hover:bg-yellow-600" : ""}>
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
                      publish_timestamp: checked && !formData.publish_timestamp ? timestamp : formData.publish_timestamp
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
                      onChange={(e) => handleInputChange('publish_timestamp', e.target.value)}
                      className="border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publish_working_notes">Wat werkte er allemaal goed?</Label>
                    <Textarea
                      id="publish_working_notes"
                      placeholder="Beschrijf wat er op dit moment allemaal goed werkte..."
                      value={formData.publish_working_notes || ''}
                      onChange={(e) => handleInputChange('publish_working_notes', e.target.value)}
                      className="min-h-[100px] border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publish_reason">Waarom deze Publish versie?</Label>
                    <Textarea
                      id="publish_reason"
                      placeholder="Leg uit waarom je deze Publish versie maakt (bijv. voor een grote wijziging)..."
                      value={formData.publish_reason || ''}
                      onChange={(e) => handleInputChange('publish_reason', e.target.value)}
                      className="min-h-[100px] border-slate-200"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Project Knowledge Feedback - Only for multiprompts */}
          {formData.type === 'multiprompt' && (
            <Card className="shadow-lg border-purple-200 mt-6">
              <CardContent className="p-6">
                <FileChangesFeedback
                  value={formData.file_changes_feedback}
                  onChange={(value) => handleInputChange('file_changes_feedback', value)}
                />
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate(createPageUrl(`ViewItem?id=${itemId}`))}>Annuleren</Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Opslaan...' : 'Wijzigingen Opslaan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}