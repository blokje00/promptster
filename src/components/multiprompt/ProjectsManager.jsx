import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, FolderCode, GitCommit, Github, Search } from "lucide-react";
import { projectBorderColors } from "@/components/lib/constants";
import { AiToolIcon } from "@/components/lib/aiTools";
import ProjectEditDialog from "./ProjectEditDialog";
import { useDeleteProject } from "@/components/hooks/useDeleteProject";

export default function ProjectsManager({ projects = [] }) {
  const [dialogMode, setDialogMode] = useState("edit");
  const [editingProject, setEditingProject] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // TASK-2 (rich description): search across all project metadata
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(p => {
      const haystack = [
        p.name,
        p.description,
        p.ai_tool,
        p.local_code_path,
        p.github_repo,
        ...(Array.isArray(p.push_log) ? p.push_log.map(e => e.message) : []),
        ...(Array.isArray(p.domains) ? p.domains : []),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, search]);

  const deleteMutation = useDeleteProject();

  const handleCreateStart = () => {
    setDialogMode("create");
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const handleEditStart = (project) => {
    setDialogMode("edit");
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Project List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Projects</CardTitle>
            <Button
              onClick={handleCreateStart}
              size="icon"
              className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* TASK-2: search across name, description, tool, paths, repo, push log */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects (description, tool, path, repo, pushes)..."
              className="pl-8"
            />
          </div>
          {filteredProjects.map(project => (
            <div key={project.id} className={`p-4 rounded-lg border-2 ${projectBorderColors[project.color]} bg-white`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {/* TASK-1 (icons): AI tool monogram instead of color dot */}
                  <AiToolIcon tool={project.ai_tool} size="lg" />
                  <div>
                    <p className="font-medium text-slate-800">{project.name}</p>
                    {/* TASK-2: description rendered with preserved line breaks */}
                    <p className="text-sm text-slate-500 whitespace-pre-line line-clamp-4">{project.description}</p>
                    {/* TASK-3: workspace metadata on the project card */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {project.github_repo && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 truncate max-w-[220px]" title={project.github_repo}>
                          <Github className="w-3 h-3 shrink-0" /> {project.github_repo}
                        </span>
                      )}
                      {project.local_code_path && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 truncate max-w-[280px]" title={project.local_code_path}>
                          <FolderCode className="w-3 h-3 shrink-0" /> {project.local_code_path}
                        </span>
                      )}
                      {Array.isArray(project.push_log) && project.push_log.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400" title={project.push_log[0]?.message}>
                          <GitCommit className="w-3 h-3" /> {project.push_log.length} push(es)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEditStart(project)}>
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(project.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <p className="text-center text-slate-400 py-4">
              {search ? "No projects match your search" : "No projects yet"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Shared create/edit dialog (TASK-3/TASK-4) */}
      <ProjectEditDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        project={editingProject}
      />
    </div>
  );
}
