import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projects as projectsApi, thoughts } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function RecycleBin() {
  const queryClient = useQueryClient();
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);

  // 1b. Fetch Projects (for name lookup)
  const { data: projects = [] } = projectsApi.useList();

  // 2. Fetch Deleted Thoughts
  const { data: deletedThoughts = [], isLoading } = thoughts.useDeletedThoughts({
    staleTime: 0, // Always fresh
  });

  // 3. Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: (id) => thoughts.restore(id),
    onSuccess: (restoredItem) => {
      // Critical: Ensure Multiprompt (activeThoughts) and the recycle bin both update
      thoughts.invalidateThoughtCaches(queryClient);

      // Context Switching: Update Project ID
      if (restoredItem?.project_id) {
        localStorage.setItem('lastSelectedProjectId', restoredItem.project_id);
        // Dispatch event for Multiprompt to pick up instantly
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'lastSelectedProjectId',
          newValue: restoredItem.project_id
        }));
        toast.success("Task restored to project");
      } else {
        toast.success("Task restored");
      }
    },
    onError: () => toast.error("Failed to restore task")
  });

  // 4. Permanent Delete Mutation
  const deletePermanentMutation = useMutation({
    mutationFn: (id) => thoughts.remove(id),
    onSuccess: () => {
      thoughts.invalidateThoughtCaches(queryClient);
      toast.success("Task permanently deleted");
    }
  });

  // 5. Empty Bin Mutation
  const emptyBinMutation = useMutation({
    mutationFn: async () => {
      const promises = deletedThoughts.map(t => thoughts.remove(t.id));
      await Promise.all(promises);
    },
    onSuccess: async () => {
      thoughts.invalidateThoughtCaches(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['deletedThoughtsCount'] });
      toast.success("Recycle bin emptied");
      setIsConfirmingDeleteAll(false);
    }
  });

  return (
    <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Recycle Bin</h1>
              <p className="text-slate-500 mt-1">Recover deleted tasks or remove them permanently</p>
            </div>
            {deletedThoughts.length > 0 && (
              <AlertDialog open={isConfirmingDeleteAll} onOpenChange={setIsConfirmingDeleteAll}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Empty Bin
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Empty Recycle Bin?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {deletedThoughts.length} items. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsConfirmingDeleteAll(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={(e) => {
                        e.preventDefault();
                        emptyBinMutation.mutate();
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {emptyBinMutation.isPending ? "Deleting..." : "Yes, Empty Bin"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : deletedThoughts.length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Trash2 className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Recycle Bin is Empty</h3>
                <p className="text-slate-500">Deleted tasks will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {deletedThoughts.map((thought) => (
                <Card key={thought.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {new Date(thought.deleted_at || thought.updated_date).toLocaleDateString()}
                          </Badge>
                          {thought.project_id && (
                            (() => {
                              const p = projects.find(p => p.id === thought.project_id);
                              return (
                                <Badge variant="outline" className={`text-xs ${p ? `text-${p.color}-600 border-${p.color}-200 bg-${p.color}-50` : 'text-blue-600 border-blue-200 bg-blue-50'}`}>
                                  {p?.name || "Promptster.app"}
                                </Badge>
                              );
                            })()
                          )}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                          {thought.content}
                        </p>
                      </div>
                      <div className="flex sm:flex-col items-center gap-2 shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => restoreMutation.mutate(thought.id)}
                          disabled={restoreMutation.isPending}
                          className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 whitespace-nowrap"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deletePermanentMutation.mutate(thought.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}