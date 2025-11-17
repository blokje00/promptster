import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Edit, Copy, CheckCircle, Star, MessageSquare, Image as ImageIcon, ZoomIn, FileArchive, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ViewItem() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const itemId = urlParams.get("id");
  const [copied, setCopied] = useState(false);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => base44.entities.Item.get(itemId),
    enabled: !!itemId,
  });

  const handleCopy = () => {
    if (!item?.content) return;
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    toast.success('Inhoud gekopieerd naar klembord!');
    setTimeout(() => setCopied(false), 2000);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
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
          <Link to={createPageUrl(`EditItem?id=${itemId}`)}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Edit className="w-4 h-4 mr-2" />
              Bewerken
            </Button>
          </Link>
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
            {item.notes && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Notities
                </h4>
                <p className="text-sm text-blue-700 whitespace-pre-wrap">{item.notes}</p>
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
            
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Inhoud</h4>
              <div className="relative">
                <div className="bg-slate-900 rounded-xl p-4 max-h-[60vh] overflow-auto">
                  <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all">
                    {item.content}
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
  );
}