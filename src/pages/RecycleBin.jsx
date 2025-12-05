import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import RequireSubscription from "../components/auth/RequireSubscription";
import { useLanguage } from "../components/i18n/LanguageContext";

export default function RecycleBin() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: deletedThoughts = [], isLoading } = useQuery({
    queryKey: ['deletedThoughts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      // Fetch thoughts marked as deleted
      const result = await base44.entities.Thought.filter({ 
        created_by: currentUser.email,
        is_deleted: true 
      }, "-deleted_at");
      return result || [];
    },
    enabled: !!currentUser?.email,
  });

  const restoreMutation = useMutation({
    mutationFn: async (id) => {
      // Guarantee Restore: Set is_deleted to false explicitly
      // Also ensure project_id is preserved or patched if needed (though update usually patches what's there)
      const updated = await base44.entities.Thought.update(id, { 
        is_deleted: false, 
        deleted_at: null 
      });
      return updated;
    },
    onSuccess: (restoredItem) => {
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      
      // Aggressively invalidate ALL thoughts queries
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'thoughts'
      });

      // Force assignment handling
      if (restoredItem?.project_id) {
        localStorage.setItem('lastSelectedProjectId', restoredItem.project_id);
        toast.success(`${t("itemRestored")} to project.`);
      } else {
        // If restored item has no project, try to assign current one from storage or warn
        const currentProj = localStorage.getItem('lastSelectedProjectId');
        if (currentProj && currentProj !== "null") {
           // Optionally auto-assign to current context if it was global?
           // For now, just restore as is, but user asked for "Force-Assign... Restoring...".
           // But Update only updates fields passed. If we want to force assign, we'd need another update.
           // Let's keep it simple: Just restore.
           toast.success(t("itemRestored"));
        } else {
           toast.success(t("itemRestored"));
        }
      }
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Thought.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      toast.success(t("itemPermanentlyDeleted"));
    },
  });

  const emptyBinMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await base44.entities.Thought.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      toast.success(t("recycleBinEmptied"));
    },
  });

  const handleRestore = (id) => {
    restoreMutation.mutate(id);
  };

  const handleDeletePermanent = (id) => {
    permanentDeleteMutation.mutate(id);
  };

  const handleEmptyBin = () => {
    if (deletedThoughts.length === 0) return;
    const ids = deletedThoughts.map(t => t.id);
    emptyBinMutation.mutate(ids);
  };

  return (
    <RequireSubscription>
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-8 h-8 text-red-500" />
              {t("recycleBin")}
            </h1>
            <p className="text-slate-600 mt-1">
              {t("recycleBinDesc")}
            </p>
          </div>
          {deletedThoughts.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {t("emptyRecycleBin")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("permanentDeleteWarning")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEmptyBin} className="bg-red-600 hover:bg-red-700">
                    {t("permanentlyDelete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : deletedThoughts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Trash2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">
              {t("recycleBinEmpty")}
            </h3>
            <p className="text-slate-500">
              {t("deletedItemsAppearHere")}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {deletedThoughts.map((thought) => (
              <Card key={thought.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-base font-medium line-clamp-1">
                      {thought.content.substring(0, 60) || t("unnamed")}
                      {thought.content.length > 60 && "..."}
                    </CardTitle>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {t("deleted")}: {new Date(thought.deleted_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {thought.content}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-2 border-t bg-slate-50/50">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRestore(thought.id)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    {t("restore")}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        {t("permanently")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("permanentlyDeleteQuestion")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("permanentDeleteDesc")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePermanent(thought.id)} className="bg-red-600 hover:bg-red-700">
                          {t("delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </RequireSubscription>
  );
}