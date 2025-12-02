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

export default function RecycleBin() {
  const queryClient = useQueryClient();
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
    mutationFn: (id) => base44.entities.Thought.update(id, { 
      is_deleted: false, 
      deleted_at: null 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      queryClient.invalidateQueries({ queryKey: ['thoughts'] }); // Refresh main list too
      toast.success("Item hersteld");
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Thought.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      toast.success("Item definitief verwijderd");
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
      toast.success("Prullenbak geleegd");
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
              Prullenbak
            </h1>
            <p className="text-slate-600 mt-1">
              Beheer verwijderde taken. Items hier kunnen nog worden hersteld.
            </p>
          </div>
          {deletedThoughts.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Prullenbak Legen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dit zal alle items in de prullenbak <strong>permanent</strong> verwijderen. 
                    Deze actie kan niet ongedaan worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEmptyBin} className="bg-red-600 hover:bg-red-700">
                    Definitief Verwijderen
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
              Prullenbak is leeg
            </h3>
            <p className="text-slate-500">
              Verwijderde taken verschijnen hier.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {deletedThoughts.map((thought) => (
              <Card key={thought.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-base font-medium line-clamp-1">
                      {thought.content.substring(0, 60) || "Naamloze taak"}
                      {thought.content.length > 60 && "..."}
                    </CardTitle>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      Verwijderd: {new Date(thought.deleted_at).toLocaleDateString()}
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
                    Herstellen
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Definitief
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Definitief verwijderen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Je staat op het punt om dit item permanent te verwijderen. Dit kan niet ongedaan worden gemaakt.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePermanent(thought.id)} className="bg-red-600 hover:bg-red-700">
                          Verwijderen
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