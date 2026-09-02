import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, CheckCircle2, Settings, GitCommit, Trash2 } from "lucide-react";
import { projectColors } from "@/components/lib/constants";
import { AiToolIcon } from "@/components/lib/aiTools";
import * as projects from "@/api/projects";
import { toast } from "sonner";
import ProjectEditDialog from "./ProjectEditDialog";
import { useDeleteProject } from "@/components/hooks/useDeleteProject";

function ProjectSelector({
  projects: projectList,
  selectedProjectId,
  selectedProject,
  onSelectProject,
  allThoughtsCount,
  getProjectCount
}) {
  // TASK-4: dialogs driven from the per-project actions menu
  const [editDialogProject, setEditDialogProject] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("edit");
  const [pushLogProject, setPushLogProject] = useState(null);
  const [pushMessage, setPushMessage] = useState("");
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(null);

  const deleteMutation = useDeleteProject();

  // TASK-3: quick "log push" without opening the full edit dialog
  const pushLogMutation = projects.useUpdate({
    onSuccess: () => {
      setPushLogProject(null);
      setPushMessage("");
      toast.success("Push logged");
    },
    onError: (error) => toast.error("Failed to log push: " + error.message)
  });

  const handlePushLog = (project, message) => {
    const existing = Array.isArray(project.push_log) ? project.push_log : [];
    pushLogMutation.mutate({
      id: project.id,
      data: { push_log: [{ date: new Date().toISOString(), message }, ...existing] }
    });
  };

  const handleCreateStart = () => {
    setDialogMode("create");
    setEditDialogProject(null);
    setIsEditDialogOpen(true);
  };

  const handleEditStart = (project) => {
    setDialogMode("edit");
    setEditDialogProject(project);
    setIsEditDialogOpen(true);
  };

  return (
    <>
    <Card className="mb-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardContent className="pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">My Projects</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateStart}
          className="border-dashed border-2 hover:bg-indigo-50 dark:hover:bg-slate-800 h-9 px-4"
        >
          <Plus className="w-5 h-5 mr-1" />
          New Project
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={!selectedProjectId ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectProject("")}
          className={!selectedProjectId ? "bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600" : ""}
        >
          All Projects
          {allThoughtsCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-red-500 text-white hover:bg-red-600 border-0 px-1.5 py-0 h-4 text-[10px]">
              {allThoughtsCount}
            </Badge>
          )}
        </Button>
        {projectList.map(p => (
          /* TASK-4: project chip = activate on click + ⋯ actions menu */
          <div
            key={p.id}
            className={`inline-flex items-center rounded-md border overflow-hidden ${
              selectedProjectId === p.id
                ? `${projectColors[p.color]} border-transparent text-white`
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            }`}
          >
            <button
              onClick={() => onSelectProject(p.id)}
              className="flex items-center px-3 h-8 text-sm font-medium hover:opacity-90"
            >
              {/* TASK-1 (icons): AI tool monogram instead of a plain color dot */}
              <AiToolIcon tool={p.ai_tool} size="sm" className="mr-2" />
              {p.name} ({getProjectCount(p.id)})
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`h-8 px-1 border-l flex items-center ${
                    selectedProjectId === p.id
                      ? "border-white/30 hover:bg-white/10"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  aria-label={`Actions for ${p.name}`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <DropdownMenuItem onClick={() => onSelectProject(p.id)} className="cursor-pointer">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  <span>Activate</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditStart(p)} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4 text-slate-500" />
                  <span>Edit settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPushLogProject(p); setPushMessage(""); }} className="cursor-pointer">
                  <GitCommit className="mr-2 h-4 w-4 text-indigo-500" />
                  <span>Log push</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem
                  onClick={() => setConfirmDeleteProject(p)}
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
      </CardContent>
    </Card>

    {/* TASK-4: full create/edit dialog shared with ProjectsManager */}
    <ProjectEditDialog
      open={isEditDialogOpen}
      onOpenChange={setIsEditDialogOpen}
      mode={dialogMode}
      project={editDialogProject}
    />

    {/* TASK-3: quick push-log dialog */}
    <Dialog open={Boolean(pushLogProject)} onOpenChange={(open) => { if (!open) setPushLogProject(null); }}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <GitCommit className="w-4 h-4" /> Log push — {pushLogProject?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Input
            value={pushMessage}
            onChange={e => setPushMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && pushMessage.trim()) {
                handlePushLog(pushLogProject, pushMessage.trim());
              }
            }}
            placeholder="Short description of what was pushed..."
            autoFocus
          />
          {Array.isArray(pushLogProject?.push_log) && pushLogProject.push_log.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-slate-500">
              {pushLogProject.push_log.slice(0, 5).map((entry, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="font-mono text-slate-400 shrink-0">
                    {entry.date ? new Date(entry.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) : "—"}
                  </span>
                  <span className="truncate">{entry.message}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPushLogProject(null)}>Cancel</Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!pushMessage.trim() || pushLogMutation.isPending}
              onClick={() => handlePushLog(pushLogProject, pushMessage.trim())}
            >
              {pushLogMutation.isPending ? "Saving..." : "Log push"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* TASK-4: delete confirmation */}
    <Dialog open={Boolean(confirmDeleteProject)} onOpenChange={(open) => { if (!open) setConfirmDeleteProject(null); }}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">Delete "{confirmDeleteProject?.name}"?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This deletes the project including its templates and structures; tasks are moved to the recycle bin.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmDeleteProject(null)}>Cancel</Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => {
              const id = confirmDeleteProject.id;
              deleteMutation.mutate(id, {
                onSuccess: () => {
                  if (selectedProjectId === id) onSelectProject("");
                  setConfirmDeleteProject(null);
                }
              });
            }}
          >
            {deleteMutation.isPending ? "Deleting..." : "Yes, delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default React.memo(ProjectSelector);
