import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Sparkles, Save, Plus, Loader2, GitCommit, Trash2 } from "lucide-react";
import { AI_TOOLS, AI_TOOL_META, AiToolIcon } from "@/components/lib/aiTools";
import * as projects from "@/api/projects";
import { projectStructureAnalysisPrompt } from "@/lib/prompts";
import { toast } from "sonner";

// Re-export for backwards compatibility
export { AI_TOOLS };

// TASK-2 (rich description): starter structure for the big description field
const DESCRIPTION_TEMPLATE = `## Wat is het


## Tools & AI
- 

## Paden
- Code: 
- Assets: 

## Type
- Web / PWA / App: 

## Talen & bronnen
- 

## GitHub versies
- `;

/**
 * TASK-3/TASK-4: shared create/edit dialog for projects, extracted from
 * ProjectsManager so the project selector can open it directly. Adds the
 * Workspace section: local code path, AI tool, and a GitHub push log.
 */
export default function ProjectEditDialog({ open, onOpenChange, mode = "edit", project = null }) {
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("blue");
  const [editDesc, setEditDesc] = useState("");
  const [editConfig, setEditConfig] = useState("");
  const [pastedJSON, setPastedJSON] = useState("");
  const [editComponentMapping, setEditComponentMapping] = useState({});
  const [editDomains, setEditDomains] = useState([]);
  // TASK-3: workspace metadata
  const [editCodePath, setEditCodePath] = useState("");
  const [editAiTool, setEditAiTool] = useState("");
  const [editTargetModel, setEditTargetModel] = useState("");
  const [editPushLog, setEditPushLog] = useState([]);
  const [newPushMessage, setNewPushMessage] = useState("");
  // TASK-2 (rich description): GitHub repo/version reference
  const [editGithubRepo, setEditGithubRepo] = useState("");

  // (Re)populate form whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && project) {
      setEditName(project.name || "");
      setEditColor(project.color || "blue");
      setEditDesc(project.description || "");
      setEditConfig(project.technical_config_markdown || "");
      setPastedJSON(project.llm_response_parser_instruction || "");
      setEditComponentMapping(project.component_mapping || {});
      setEditDomains(project.domains || []);
      setEditCodePath(project.local_code_path || "");
      setEditAiTool(project.ai_tool || "");
      setEditTargetModel(project.target_model || "");
      setEditPushLog(Array.isArray(project.push_log) ? project.push_log : []);
      setEditGithubRepo(project.github_repo || "");
    } else {
      setEditName("");
      setEditColor("blue");
      setEditDesc("");
      setEditConfig("");
      setPastedJSON("");
      setEditComponentMapping({});
      setEditDomains([]);
      setEditCodePath("");
      setEditAiTool("");
      setEditTargetModel("");
      setEditPushLog([]);
      setEditGithubRepo("");
    }
    setNewPushMessage("");
  }, [open, mode, project]);

  const createMutation = projects.useCreate({
    onSuccess: () => {
      onOpenChange(false);
      toast.success("Project created");
    },
    onError: (error) => toast.error("Failed to create project: " + error.message)
  });

  const updateMutation = projects.useUpdate({
    onSuccess: () => {
      onOpenChange(false);
      toast.success("Project updated");
    },
    onError: (error) => toast.error("Failed to update project: " + error.message)
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleJSONImport = () => {
    if (!pastedJSON.trim()) {
      toast.error("Please paste JSON first");
      return;
    }
    try {
      const jsonMatch = pastedJSON.match(/```json\n([\s\S]*?)\n```/) || pastedJSON.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : pastedJSON;
      const data = JSON.parse(jsonStr);

      if (data.name) setEditName(data.name);
      if (data.description) setEditDesc(data.description);
      if (data.technical_config_markdown) setEditConfig(data.technical_config_markdown);

      const mapping = {};
      if (data.pages && Array.isArray(data.pages)) {
        data.pages.forEach(page => {
          if (page.name) {
            mapping[page.name] = Array.isArray(page.components) ? page.components : [];
          }
        });
      }
      if (data.component_mapping && typeof data.component_mapping === 'object') {
        Object.assign(mapping, data.component_mapping);
      }
      if (Object.keys(mapping).length > 0) setEditComponentMapping(mapping);

      let domains = [];
      if (data.domains && Array.isArray(data.domains)) {
        domains = data.domains;
      } else if (data.entities && Array.isArray(data.entities)) {
        domains = data.entities.map(e => e.name || e).filter(Boolean);
      }
      if (domains.length > 0) setEditDomains(domains);

      toast.success(`✓ Parsed: ${Object.keys(mapping).length} pages, ${domains.length} domains`);
    } catch (e) {
      toast.error("Invalid JSON format");
    }
  };

  const handleAddPushEntry = () => {
    if (!newPushMessage.trim()) return;
    setEditPushLog([{ date: new Date().toISOString(), message: newPushMessage.trim() }, ...editPushLog]);
    setNewPushMessage("");
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Project name is required");
      return;
    }
    const projectData = {
      name: editName,
      color: editColor,
      description: editDesc,
      technical_config_markdown: editConfig,
      llm_response_parser_instruction: pastedJSON.trim() || null,
      component_mapping: editComponentMapping,
      domains: editDomains,
      // TASK-3: workspace metadata
      local_code_path: editCodePath.trim() || null,
      ai_tool: editAiTool || null,
      target_model: editTargetModel || null,
      push_log: editPushLog,
      github_repo: editGithubRepo.trim() || null,
    };

    if (mode === "create") {
      await createMutation.mutateAsync(projectData);
    } else if (project?.id) {
      await updateMutation.mutateAsync({ id: project.id, data: projectData });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Project" : "Edit Project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
          <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Project Name..." />
          {/* TASK-1 (icons): pick the AI tool icon; its brand color becomes the project color */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">AI tool (sets project icon & color)</label>
            <div className="flex gap-2 flex-wrap">
              {AI_TOOLS.map(tool => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => { setEditAiTool(tool); setEditColor(AI_TOOL_META[tool].color); }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs ${
                    editAiTool === tool
                      ? 'border-indigo-500 ring-1 ring-indigo-300 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <AiToolIcon tool={tool} size="sm" /> {tool}
                </button>
              ))}
            </div>
          </div>
          {/* Target model: which LLM the prompts are written for */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Target AI model (which LLM prompts are written for)</label>
            <select
              value={editTargetModel}
              onChange={e => setEditTargetModel(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="">Not set</option>
              <option value="gemini">Gemini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude-sonnet">Claude Sonnet</option>
              <option value="claude-opus">Claude Opus</option>
              <option value="llama">Llama</option>
              <option value="other">Other</option>
            </select>
          </div>
          {/* TASK-2 (rich description): big, structured, searchable description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-500">Project description (searchable)</label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-indigo-500"
                onClick={() => setEditDesc(prev => prev?.trim() ? prev : DESCRIPTION_TEMPLATE)}
              >
                Insert template
              </Button>
            </div>
            <Textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Describe the project: tools used, paths, web/PWA, sources, languages, GitHub versions..."
              className="min-h-[220px] font-mono text-xs"
            />
          </div>

          {/* TASK-3: Workspace section */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="text-sm font-medium">Workspace</label>
            <Input
              value={editCodePath}
              onChange={e => setEditCodePath(e.target.value)}
              placeholder="Local code path, e.g. /Users/me/Documents/Qoder/promptster"
              className="font-mono text-xs"
            />
            <Input
              value={editGithubRepo}
              onChange={e => setEditGithubRepo(e.target.value)}
              placeholder="GitHub repo / version, e.g. github.com/user/repo @ v1.2"
              className="font-mono text-xs"
            />

            {/* TASK-3: GitHub push log */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <GitCommit className="w-3 h-3" /> Push log
              </label>
              <div className="flex gap-2">
                <Input
                  value={newPushMessage}
                  onChange={e => setNewPushMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPushEntry(); } }}
                  placeholder="Short push description..."
                  className="text-xs"
                />
                <Button variant="outline" size="sm" onClick={handleAddPushEntry} disabled={!newPushMessage.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {editPushLog.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-100 rounded-md p-2">
                  {editPushLog.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-slate-400 shrink-0 font-mono">
                        {entry.date ? new Date(entry.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : "—"}
                      </span>
                      <span className="flex-1 truncate">{entry.message}</span>
                      <button
                        onClick={() => setEditPushLog(editPushLog.filter((_, i) => i !== idx))}
                        className="text-slate-300 hover:text-red-500 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="text-sm font-medium">Technical Config (Markdown)</label>
            <Textarea value={editConfig} onChange={e => setEditConfig(e.target.value)} className="font-mono text-sm min-h-[150px]" />
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-slate-500">Need structure? Copy this prompt for your LLM:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const prompt = `Analyze the codebase and provide a technical configuration summary in Markdown. Include:
1. Tech Stack (Frameworks, Libraries)
2. File Structure (Key directories)
3. Key Components & Entities
4. Styling & Theming Approach
5. Conventions (Naming, Async, Error Handling)

Format as clear Markdown headers and lists.`;
                  navigator.clipboard.writeText(prompt);
                  toast.success("Structure prompt copied!");
                }}
              >
                <Copy className="w-3 h-3" /> Copy Prompt
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Auto-Parse Project Structure</label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const prompt = projectStructureAnalysisPrompt();
                  navigator.clipboard.writeText(prompt);
                  toast.success("Structure analysis prompt copied!");
                }}
              >
                <Copy className="w-3 h-3" /> Copy Analysis Prompt
              </Button>
            </div>
            <Textarea
              placeholder="Paste LLM's JSON response here..."
              className="min-h-[100px] text-xs font-mono"
              value={pastedJSON}
              onChange={(e) => setPastedJSON(e.target.value)}
            />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleJSONImport} disabled={!pastedJSON.trim()}>
                <Sparkles className="w-4 h-4 mr-2" />
                Import Structure
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-6 border-t border-slate-100 mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!editName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {mode === "create" ? "Create Project" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
