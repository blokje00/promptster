import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * TASK-4: shared cascade-delete for projects (soft-deletes tasks, hard-deletes
 * templates + structures, then the project). Used by ProjectsManager and the
 * project actions menu in ProjectSelector.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const [thoughts, templates, projectStructures] = await Promise.all([
        base44.entities.Thought.filter({ project_id: id }),
        base44.entities.PromptTemplate.filter({ project_id: id }),
        base44.entities.ProjectStructure.filter({ project_id: id })
      ]);

      // Mark thoughts as deleted (soft delete)
      await Promise.all(
        thoughts.map(thought => base44.entities.Thought.update(thought.id, {
          is_deleted: true,
          deleted_at: new Date().toISOString()
        }))
      );

      // Hard delete templates + structures
      await Promise.all([
        ...templates.map(template => base44.entities.PromptTemplate.delete(template.id)),
        ...projectStructures.map(structure => base44.entities.ProjectStructure.delete(structure.id)),
      ]);

      await base44.entities.Project.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['activeThoughts'] });
      queryClient.invalidateQueries({ queryKey: ['allThoughtsCount'] });
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['projectStructures'] });
      toast.success("Project deleted with all associated data");
    },
    onError: (error) => {
      toast.error("Failed to delete project: " + error.message);
    }
  });
}
