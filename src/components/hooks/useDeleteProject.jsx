import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import * as projects from "@/api/projects";
import * as thoughts from "@/api/thoughts";
import * as templates from "@/api/templates";
import * as projectStructures from "@/api/projectStructures";

/**
 * TASK-4: shared cascade-delete for projects (soft-deletes tasks, hard-deletes
 * templates + structures, then the project). Used by ProjectsManager and the
 * project actions menu in ProjectSelector.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const email = currentUser?.email;

  return useMutation({
    mutationFn: async (id) => {
      const [projectThoughts, projectTemplates, structures] = await Promise.all([
        thoughts.listMine(email, { filters: { project_id: id } }),
        templates.listMine(email, { filters: { project_id: id } }),
        projectStructures.listMine(email, { filters: { project_id: id } }),
      ]);

      // Mark thoughts as deleted (soft delete)
      await Promise.all(
        projectThoughts.map(thought => thoughts.softDelete(thought.id))
      );

      // Hard delete templates + structures
      await Promise.all([
        ...projectTemplates.map(template => templates.remove(template.id)),
        ...structures.map(structure => projectStructures.remove(structure.id)),
      ]);

      await projects.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projects.keys.all });
      thoughts.invalidateThoughtCaches(queryClient);
      queryClient.invalidateQueries({ queryKey: templates.keys.all });
      queryClient.invalidateQueries({ queryKey: projectStructures.keys.all });
      toast.success("Project deleted with all associated data");
    },
    onError: (error) => {
      toast.error("Failed to delete project: " + error.message);
    }
  });
}
