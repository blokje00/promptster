import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, X, Star, GitBranch, Circle, CheckCircle2, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUploadZone from "../components/dashboard/ImageUploadZone";
import ZipUploadZone from "../components/dashboard/ZipUploadZone";
import RequireSubscription from "../components/auth/RequireSubscription";

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

export default function AddItem() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const result = await base44.entities.Project.filter({ created_by: currentUser.email });
      return result || [];
    },
    enabled: !!currentUser?.email,
  });

  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return localStorage.getItem('lastSelectedProjectId') || "";
  });

  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('lastSelectedProjectId', projectId);
    setFormData(prev => ({ ...prev, project_id: projectId || null }));
  };
  
  const [formData, setFormData] = useState({
    title: "",
    type: "prompt",
    project_id: localStorage.getItem('lastSelectedProjectId') || null,
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
    publish_reason: "",
    status: "open"
  });
  
  const [tagInput, setTagInput] = useState("");
  const [isRestoringDraft, setIsRestoringDraft] = useState(true);

  // Autosave effect
  useEffect(() => {
    if (!isRestoringDraft && currentUser?.id) {
      const draftData = {
        ...formData,
        timestamp: new Date().getTime()
      };
      localStorage.setItem(`additem_draft_${currentUser.id}`, JSON.stringify(draftData));
      localStorage.setItem(`additem_tag_draft_${currentUser.id}`, tagInput);
    }
  }, [formData, tagInput, currentUser, isRestoringDraft]);

  // Restore autosave effect
  useEffect(() => {
    if (currentUser?.id) {
      const savedDraft = localStorage.getItem(`additem_draft_${currentUser.id}`);
      const savedTag = localStorage.getItem(`additem_tag_draft_${currentUser.id}`);
      
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          // Only restore if not too old (e.g. 24 hours)
          if (new Date().getTime() - parsedDraft.timestamp < 24 * 60 * 60 * 1000) {
             // Remove timestamp before setting state
             delete parsedDraft.timestamp;
             setFormData(prev => ({...prev, ...parsedDraft}));
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
      
      if (savedTag) {
        setTagInput(savedTag);
      }
      
      setIsRestoringDraft(false);
    }
  }, [currentUser]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      // Clear draft on success
      if (currentUser?.id) {
        localStorage.removeItem(`additem_draft_${currentUser.id}`);
        localStorage.removeItem(`additem_tag_draft_${currentUser.id}`);
      }
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
    <RequireSubscription>
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
                Add New Item
              </h1>
              <p className="text-slate-600 mt-1">Add a new prompt or code snippet</p>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!selectedProjectId ? "default" : "outline"}
              size="sm"
              onClick={() => handleProjectChange("")}
              className={!selectedProjectId ? "bg-slate-700" : ""}
            >
              No Project
            </Button>
            {projects.map(project => (
              <Button
                key={project.id}
                variant={selectedProjectId === project.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleProjectChange(project.id)}
                className={`${selectedProjectId === project.id ? `${projectColors[project.color]} border-0` : ""}`}
              >
                <div className={`w-3 h-3 rounded-full ${projectColors[project.color]} mr-2 border border-white/50`} />
                {project.name}
              </Button>
            ))}
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
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="E.g.: React useEffect Hook"
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
                      <SelectItem value="idee">Idea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.type === "code" || formData.type === "snippet") && (
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
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
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Short description of this item"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="border-slate-200"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.status === "open" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({...formData, status: "open"})}
                    className={formData.status === "open" ? "bg-blue-500 hover:bg-blue-600" : ""}
                  >
                    <Circle className="w-4 h-4 mr-2" />
                    Open
                  </Button>
                  <Button
                    type="button"
                    variant={formData.status === "success" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({...formData, status: "success"})}
                    className={formData.status === "success" ? "bg-green-500 hover:bg-green-600" : ""}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Success
                  </Button>
                  <Button
                    type="button"
                    variant={formData.status === "failed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({...formData, status: "failed"})}
                    className={formData.status === "failed" ? "bg-red-500 hover:bg-red-600" : ""}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Failed
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Paste your code or prompt here..."
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  required
                  className="min-h-[300px] font-mono text-sm border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add personal notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="min-h-[100px] border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label>Screenshots & Images</Label>
                <ImageUploadZone
                  images={formData.images}
                  onImagesChange={(newImages) => setFormData({...formData, images: newImages})}
                />
              </div>

              <div className="space-y-2">
                <Label>ZIP Files (Code)</Label>
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
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="border-slate-200"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add
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
                  {formData.is_favorite ? 'Favorite' : 'Mark as favorite'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-slate-200 mt-6">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-green-600" />
                Publish Version
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
                  This is a Publish version / stable timestamp
                </label>
              </div>

              {formData.is_publish_version && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="publish_timestamp">Publish Date/Time</Label>
                    <Input
                      id="publish_timestamp"
                      type="datetime-local"
                      value={formData.publish_timestamp}
                      onChange={(e) => setFormData({...formData, publish_timestamp: e.target.value})}
                      className="border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publish_working_notes">What worked well?</Label>
                    <Textarea
                      id="publish_working_notes"
                      placeholder="Describe what was working well at this point..."
                      value={formData.publish_working_notes}
                      onChange={(e) => setFormData({...formData, publish_working_notes: e.target.value})}
                      className="min-h-[100px] border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publish_reason">Why this Publish version?</Label>
                    <Textarea
                      id="publish_reason"
                      placeholder="Explain why you're creating this Publish version..."
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </RequireSubscription>
  );
}