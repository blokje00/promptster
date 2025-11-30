import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Edit, Copy, CheckCircle, Star, MessageSquare, Image as ImageIcon, ZoomIn, FileArchive, Download, GitBranch, Calendar, ClipboardCheck, ClipboardPaste, Save, Loader2, ListChecks } from "lucide-react";
import FileChangesFeedback from "../components/items/FileChangesFeedback";
import RequireSubscription from "../components/auth/RequireSubscription";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ViewItem() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(location.search);
  const itemId = urlParams.get("id");
  const [copied, setCopied] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => base44.entities.Item.get(itemId),
    enabled: !!itemId,
  });

  const updateItemMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.update(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }
  });

  const handleCopy = () => {
    if (!item?.content) return;
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    toast.success('Inhoud gekopieerd naar klembord!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasteFeedbackDirect = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setIsSavingFeedback(true);
        // Append to existing feedback or set new
        const newFeedback = item.file_changes_feedback 
          ? `${item.file_changes_feedback}\n\n---\n\n${text}` 
          : text;
        await updateItemMutation.mutateAsync({
          file_changes_feedback: newFeedback
        });
        toast.success('Feedback geplakt en opgeslagen!');
        setIsSavingFeedback(false);
      }
    } catch (err) {
      toast.error('Kon niet plakken uit klembord');
      setIsSavingFeedback(false);
    }
  };

  const handlePasteFeedback = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFeedbackText(text);
        toast.success('Feedback geplakt uit klembord');
      }
    } catch (err) {
      toast.error('Kon niet plakken uit klembord');
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSavingFeedback(true);
    try {
      await updateItemMutation.mutateAsync({
        file_changes_feedback: feedbackText,
        is_pending_check: false
      });
      toast.success('Feedback opgeslagen en controle afgerond!');
      setFeedbackText("");
    } catch (err) {
      toast.error('Kon feedback niet opslaan');
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleMarkAsChecked = async () => {
    try {
      await updateItemMutation.mutateAsync({ is_pending_check: false });
      toast.success('Controle afgerond!');
    } catch (err) {
      toast.error('Kon status niet wijzigen');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-6 w-3/4 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center p-16">
        <h2 className="text-2xl font-bold">Item niet gevonden</h2>
        <p className="text-slate-500 mt-2">Het item dat je zoekt bestaat niet of is verwijderd.</p>
        <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-6">
          Terug naar Dashboard
        </Button>
      </div>
    );
  }

  return (
    <RequireSubscription>
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {item.type === 'multiprompt' && (
              <Button
                variant="outline"
                onClick={handlePasteFeedbackDirect}
                disabled={isSavingFeedback}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                title="Plak tekst uit klembord direct als Project Kennis Feedback"
              >
                {isSavingFeedback ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ClipboardPaste className="w-4 h-4 mr-2" />
                )}
                Plak PKF
              </Button>
            )}
            <Link to={createPageUrl(`EditItem?id=${itemId}`)}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Edit className="w-4 h-4 mr-2" />
                Bewerken
              </Button>
            </Link>
          </div>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-slate-900">{item.title}</CardTitle>
                {item.description && (
                  <CardDescription className="mt-2 text-lg">{item.description}</CardDescription>
                )}
              </div>
              {item.is_favorite && (
                <Badge variant="outline" className="bg-yellow-100 border-yellow-300 text-yellow-700">
                  <Star className="w-4 h-4 mr-2 fill-yellow-500" />
                  Favoriet
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-4">
              <Badge variant="secondary">{item.type}</Badge>
              {item.language && <Badge variant="secondary">{item.language}</Badge>}
              {item.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {item.is_publish_version && (
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                  <GitBranch className="w-5 h-5" />
                  Publish Versie
                </h4>
                {item.publish_timestamp && (
                  <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(item.publish_timestamp).toLocaleString('nl-NL')}</span>
                  </div>
                )}
                {item.publish_working_notes && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">Wat werkte goed:</p>
                    <p className="text-sm text-green-700 whitespace-pre-wrap">{item.publish_working_notes}</p>
                  </div>
                )}
                {item.publish_reason && (
                  <div>
                    <p className="text-xs font-semibold text-green-800 mb-1">Reden voor Publish:</p>
                    <p className="text-sm text-green-700 whitespace-pre-wrap">{item.publish_reason}</p>
                  </div>
                )}
              </div>
            )}

            {item.notes && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Notities
                </h4>
                <div className="text-sm text-blue-700 whitespace-pre-wrap max-h-[240px] overflow-auto">
                  {item.notes}
                </div>
              </div>
            )}

            {item.images && item.images.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4" />
                  Screenshots & Afbeeldingen ({item.images.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {item.images.map((imageUrl, index) => (
                    <Dialog key={index}>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer group relative overflow-hidden rounded-lg border-2 border-slate-200 hover:border-indigo-500 transition-all">
                          <img
                            src={imageUrl}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-2 left-2 bg-slate-900 text-white text-xs font-medium px-2 py-1 rounded">
                            #{index + 1}
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
                        <div className="relative">
                          <img
                            src={imageUrl}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-auto rounded-lg"
                          />
                          <div className="mt-4 text-center text-sm text-slate-500">
                            Afbeelding {index + 1} van {item.images.length}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            )}

            {item.zip_files && item.zip_files.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <FileArchive className="w-4 h-4" />
                  ZIP Bestanden ({item.zip_files.length})
                </h4>
                <div className="space-y-2">
                  {item.zip_files.map((zipFile, index) => (
                    <Card key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileArchive className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{zipFile.name}</p>
                          <p className="text-xs text-slate-500">ZIP bestand</p>
                        </div>
                      </div>
                      <a 
                        href={zipFile.url} 
                        download={zipFile.name}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </a>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Pending Check Section - Feedback Input */}
            {item.type === 'multiprompt' && item.is_pending_check && (
              <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
                  <ClipboardCheck className="w-5 h-5" />
                  Te Controleren - Plak Feedback
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  Plak hier de feedback van Base44 (gewijzigde bestanden) om projectkennis op te bouwen.
                </p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePasteFeedback}
                      className="border-orange-400 text-orange-700 hover:bg-orange-100"
                    >
                      <ClipboardPaste className="w-4 h-4 mr-2" />
                      Plak uit klembord
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Of plak hier direct de feedback tekst..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="min-h-[120px] bg-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveFeedback}
                      disabled={!feedbackText.trim() || isSavingFeedback}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {isSavingFeedback ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Feedback Opslaan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleMarkAsChecked}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Alleen afronden
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Project Knowledge Feedback Section - Show saved feedback */}
            {item.type === 'multiprompt' && item.file_changes_feedback && (
              <FileChangesFeedback
                value={item.file_changes_feedback}
                readOnly={true}
              />
            )}

            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Inhoud</h4>
              <div className="relative">
                <div className="bg-slate-900 rounded-xl p-4 max-h-[240px] overflow-auto">
                  <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all">
                    {item.type === 'multiprompt' && item.task_checks && item.task_checks.length > 0 
                      ? item.content.split('\n').map((line, lineIdx) => {
                          // Check if line starts a DEELTAAK section
                          const taskMatch = line.match(/^---\s*DEELTAAK\s*(\d+)\s*---/i);
                          if (taskMatch) {
                            const taskNum = parseInt(taskMatch[1]) - 1;
                            const check = item.task_checks[taskNum];
                            if (check) {
                              return (
                                <span key={lineIdx} className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={check.is_checked}
                                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 border-slate-500 inline-flex"
                                    onCheckedChange={(checked) => {
                                      const newChecks = [...item.task_checks];
                                      newChecks[taskNum] = { ...newChecks[taskNum], is_checked: checked };
                                      updateItemMutation.mutate({ task_checks: newChecks });
                                    }}
                                  />
                                  <span className={check.is_checked ? 'text-green-400' : ''}>{line}</span>
                                  {'\n'}
                                </span>
                              );
                            }
                          }
                          return <span key={lineIdx}>{line}{'\n'}</span>;
                        })
                      : item.content
                    }
                  </pre>
                </div>
                <Button
                  onClick={handleCopy}
                  size="sm"
                  className="absolute top-3 right-3 bg-slate-700 hover:bg-slate-600"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </RequireSubscription>
  );
}