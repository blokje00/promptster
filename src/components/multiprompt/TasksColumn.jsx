import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Plus } from "lucide-react";
import { projectColors, projectBorderColors } from "@/components/lib/constants";
import TaskInputArea from "./TaskInputArea";
import TasksList from "./TasksList";
import OCRDebugModal from "@/components/admin/OCRDebugModal";

function TasksColumn({
  thoughts,
  projects,
  isLoading,
  selectedThoughtIds,
  toggleSelection,
  selectAll,
  deselectAll,
  selectedProject,
  selectedProjectId,
  isDropActive,
  dragHandlers,
  newThoughtInput,
  handleAddThought,
  onDragEnd,
  deleteThought,
  updateThought,
  triggerVisionAnalysis,
  currentUser,
  enableContextSuggestions,
  isLimitReached,
  maxThoughts,
}) {
  const [groupBy, setGroupBy] = useState("component");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [showOCRDebug, setShowOCRDebug] = useState(false);
  const [ocrDebugUrl, setOcrDebugUrl] = useState(null);

  const filteredThoughts = useMemo(() => {
    let filtered = thoughts;
    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.content?.toLowerCase().includes(query) ||
        t.target_page?.toLowerCase().includes(query) ||
        t.target_component?.toLowerCase().includes(query)
      );
    }
    return [...filtered].sort((a, b) => {
      if (groupBy === 'component') return (a.target_component || "").localeCompare(b.target_component || "");
      if (groupBy === 'page') return (a.target_page || "").localeCompare(b.target_page || "");
      return 0;
    });
  }, [thoughts, groupBy, taskSearchQuery]);

  return (
    <>
      <div className="space-y-4">
        <Card className={`bg-white dark:bg-slate-800 ${!selectedProjectId ? 'border-2 border-slate-800 dark:border-slate-600' : selectedProject ? `border-2 ${projectBorderColors[selectedProject.color]}` : 'border-slate-200 dark:border-slate-700'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Tasks {selectedProject && <Badge className={projectColors[selectedProject.color]}>{selectedProject.name}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TaskInputArea
              selectedProject={selectedProject}
              isDropActive={isDropActive}
              dragHandlers={dragHandlers}
              isLimitReached={isLimitReached}
              maxThoughts={maxThoughts}
              {...newThoughtInput}
              onContentChange={newThoughtInput.setNewThoughtContent}
              onAddThought={handleAddThought}
              onScreenshotsChange={newThoughtInput.setNewThoughtScreenshots}
              onFocusChange={newThoughtInput.setNewThoughtFocus}
              onContextChange={newThoughtInput.setNewThoughtContext}
              selectedProjectId={selectedProjectId}
              enableContextSuggestions={enableContextSuggestions}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddThought} className={`flex-1 ${!selectedProjectId ? 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600' : selectedProject ? projectColors[selectedProject.color] : 'bg-slate-800'}`}>
                <Plus className="w-4 h-4 mr-2" /> Task
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
              <div className="flex gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                <button onClick={() => selectAll(filteredThoughts.map(t => t.id))} className="hover:text-indigo-600 dark:hover:text-indigo-400">Select All</button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button onClick={() => deselectAll(filteredThoughts.map(t => t.id))} className="hover:text-indigo-600 dark:hover:text-indigo-400">Deselect All</button>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="h-8 px-3 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 w-[180px]"
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                />
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">By Date</SelectItem>
                    <SelectItem value="page">By Page</SelectItem>
                    <SelectItem value="component">By Component</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TasksList
              thoughts={filteredThoughts}
              projects={projects}
              isLoading={isLoading}
              selectedThoughtIds={selectedThoughtIds}
              onToggleSelect={toggleSelection}
              onDelete={deleteThought.mutate}
              onUpdateContent={(id, c) => updateThought.mutate({ id, data: { content: c } })}
              onUpdateScreenshots={(id, s) => {
                updateThought.mutate({ id, data: { screenshot_ids: s } });
                if (s && s.length > 0) triggerVisionAnalysis(id, s);
              }}
              onDebugScreenshot={(url) => {
                if (currentUser?.role === 'admin') {
                  setOcrDebugUrl(url);
                  setShowOCRDebug(true);
                }
              }}
              onUpdateFocus={(id, f) => updateThought.mutate({ id, data: { focus_type: f } })}
              onUpdateContext={(id, ctx) => updateThought.mutate({
                id,
                data: {
                  target_page: ctx.target_page,
                  target_component: ctx.target_component,
                  target_domain: ctx.target_domain
                }
              })}
              onDragEnd={onDragEnd}
              currentUser={currentUser}
            />
          </CardContent>
        </Card>
      </div>

      {currentUser?.role === 'admin' && (
        <OCRDebugModal
          isOpen={showOCRDebug}
          onClose={() => setShowOCRDebug(false)}
          screenshotUrl={ocrDebugUrl}
        />
      )}
    </>
  );
}

export default React.memo(TasksColumn);