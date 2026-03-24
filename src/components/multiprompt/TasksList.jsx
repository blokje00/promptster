import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Loader2 } from "lucide-react";
import ThoughtCard from "./ThoughtCard";
import TaskDecomposer from "./TaskDecomposer";

function TasksList({
  thoughts,
  projects,
  isLoading,
  selectedThoughtIds,
  onToggleSelect,
  onDelete,
  onUpdateContent,
  onUpdateScreenshots,
  onUpdateFocus,
  onUpdateContext,
  onDragEnd,
  onDebugScreenshot,
  currentUser
}) {
  const [decomposingThought, setDecomposingThought] = useState(null);
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="thoughts-list">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 max-h-[500px] overflow-y-auto p-1">
            {isLoading && thoughts.length === 0 && (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-sm text-slate-500">Loading tasks...</p>
              </div>
            )}
            {!isLoading && thoughts.map((thought, idx) => (
              <Draggable key={thought.id} draggableId={thought.id} index={idx}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.draggableProps}>
                    <ThoughtCard
                      thought={thought}
                      project={projects.find(p => p.id === thought.project_id)}
                      isSelected={selectedThoughtIds.includes(thought.id)}
                      onToggleSelect={() => onToggleSelect(thought.id)}
                      onDelete={onDelete}
                      onUpdateContent={onUpdateContent}
                      onUpdateScreenshots={onUpdateScreenshots}
                      onUpdateFocus={onUpdateFocus}
                      onUpdateContext={onUpdateContext}
                      onDecompose={setDecomposingThought}
                      dragHandleProps={provided.dragHandleProps}
                      onDebugScreenshot={onDebugScreenshot}
                      />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {!isLoading && thoughts.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic">No tasks found.</div>
            )}
          </div>
        )}
      </Droppable>

      <TaskDecomposer
        open={!!decomposingThought}
        onClose={() => setDecomposingThought(null)}
        thought={decomposingThought}
        currentUser={currentUser}
      />
    </DragDropContext>
  );
}
export default React.memo(TasksList);