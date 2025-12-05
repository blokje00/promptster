import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import RequireSubscription from "../components/auth/RequireSubscription";
import { useLanguage } from "../components/i18n/LanguageContext";
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

/**
 * RecycleBin - Herbouwd voor 100% betrouwbare restore.
 */
export default function RecycleBin() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);

  // 1. User & Data
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: deletedThoughts = [], isLoading } = useQuery({
    queryKey: ['deletedThoughts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Thought.filter({ is_deleted: true }, "-deleted_at");
    },
    enabled: !!currentUser?.email,
  });

  // 2. Restore Logic
  const restoreMutation = useMutation({
    mutationFn: async (thought) => {
      // Update status
      return await base44.entities.Thought.update(thought.id, { 
        is_deleted: false, 
        deleted_at: null 
      });
    },
    onSuccess: async (restoredItem) => {
      // A. Invalideer Prullenbak
      await queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      
      // B. NUCLEAR OPTION: Reset thoughts cache volledig.
      // Dit forceert Multiprompt om alles vers op te halen.
      await queryClient.resetQueries({ queryKey: ['thoughts'] });

      // C. Context Sync
      // Als item een project had, zet context zodat gebruiker het ziet bij terugkeer.
      if (restoredItem?.project_id) {
        localStorage.setItem('lastSelectedProjectId', restoredItem.project_id);
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'lastSelectedProjectId',
          newValue: restoredItem.project_id
        }));
        toast.success(`${t("itemRestored")} to project context.`);
      } else {
        toast.success(t("itemRestored"));
      }
    },
    onError: () => toast.error("Restore failed")
  });

  // 3. Delete Logic
  const deletePermanentMutation = useMutation({
    mutationFn: async (id) => base44.entities.Thought.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      toast.success(t("itemDeleted"));
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const promises = deletedThoughts.map(t => base44.entities.Thought.delete(t.id));
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      setIsConfirmingDeleteAll(false);
      toast.success(t("binEmptied"));
    }
  });

  return (
    <RequireSubscription>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{t("recycleBin")}</h1>
            <p className="text-slate-500">{t("recycleBinDesc")}</p>
          </div>
          {deletedThoughts.length > 0 && (
            <AlertDialog open={isConfirmingDeleteAll} onOpenChange={setIsConfirmingDeleteAll}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("emptyBin")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {deletedThoughts.length} items. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteAllMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleteAllMutation.isPending ? "Deleting..." : "Delete All"}
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
        ) : (
          <div className="grid gap-4">
            {deletedThoughts.length === 0 ? (
              <Card className="bg-slate-50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Trash2 className="w-12 h-12 mb-4 opacity-20" />
                  <p>The recycle bin is empty</p>
                </CardContent>
              </Card>
            ) : (
              deletedThoughts.map((thought) => (
                <Card key={thought.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {thought.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>Deleted: {new Date(thought.deleted_at).toLocaleDateString()}</span>
                        {thought.project_id && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            Project Item
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreMutation.mutate(thought)}
                        disabled={restoreMutation.isPending}
                        className="text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePermanentMutation.mutate(thought.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </RequireSubscription>
  );
}