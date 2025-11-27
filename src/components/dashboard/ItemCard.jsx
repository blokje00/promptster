import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Star, Trash2, Edit, Code2, Sparkles, FileText, CheckCircle, MessageSquare, Image as ImageIcon, FileArchive, GitBranch, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";


const typeIcons = {
  prompt: Sparkles,
  code: Code2,
  snippet: FileText
};

const typeColors = {
  prompt: "bg-purple-100 text-purple-700 border-purple-200",
  code: "bg-blue-100 text-blue-700 border-blue-200",
  snippet: "bg-green-100 text-green-700 border-green-200"
};

export default function ItemCard({ item }) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const TypeIcon = typeIcons[item.type] || FileText;

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Item.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Item verwijderd');
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) => base44.entities.Item.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    toast.success('Gekopieerd naar klembord!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleActionClick = (e) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer h-full"
      onClick={() => navigate(createPageUrl(`ViewItem?id=${item.id}`))}
    >
      <Card className={`h-full overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col ${
        item.is_publish_version ? 'border-2 border-green-400' : 'border-slate-200'
      }`}>
        <CardHeader className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded-xl ${typeColors[item.type]} border`}>
                <TypeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 truncate hover:text-indigo-600 transition-colors">{item.title}</h3>
                  {item.is_publish_version && (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 flex-shrink-0 cursor-pointer">
                          <GitBranch className="w-3 h-3 mr-1" />
                          {item.publish_timestamp ? new Date(item.publish_timestamp).toLocaleTimeString('nl-NL', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Publish'}
                        </Badge>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto">
                        <p className="text-sm">
                          {item.publish_timestamp ? new Date(item.publish_timestamp).toLocaleString('nl-NL') : 'Geen datum beschikbaar'}
                        </p>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                  {item.is_pending_check && (
                    <Badge variant="outline" className="bg-orange-50 border-orange-300 text-orange-700 flex-shrink-0">
                      <ClipboardCheck className="w-3 h-3 mr-1" />
                      Te controleren
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                handleActionClick(e);
                toggleFavoriteMutation.mutate({ id: item.id, isFavorite: item.is_favorite });
              }}
              className="flex-shrink-0"
            >
              <Star className={`w-4 h-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-5 space-y-4 flex-grow flex flex-col">
          {item.images && item.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {item.images.slice(0, 3).map((imageUrl, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border-2 border-slate-200"
                  />
                </div>
              ))}
              {item.images.length > 3 && (
                <div className="w-20 h-20 flex items-center justify-center bg-slate-100 rounded-lg border-2 border-slate-200 text-sm text-slate-600 font-medium">
                  +{item.images.length - 3}
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-900 rounded-xl p-4 max-h-48 overflow-auto flex-grow">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">
              {item.content.substring(0, 300)}
              {item.content.length > 300 && '...'}
            </pre>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap" onClick={handleActionClick}>
            <div className="flex gap-2">
              {item.language && (
                <Badge variant="outline" className="text-xs">
                  {item.language}
                </Badge>
              )}

              {item.notes && (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Badge variant="outline" className="cursor-pointer">
                      <MessageSquare className="w-3 h-3" />
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <p className="text-sm font-semibold mb-2">Notities</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.notes}</p>
                  </HoverCardContent>
                </HoverCard>
              )}

              {item.images && item.images.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {item.images.length}
                </Badge>
              )}

              {item.zip_files && item.zip_files.length > 0 && (
                <Badge variant="outline" className="text-xs bg-purple-100 border-purple-300 text-purple-700 font-medium">
                  <FileArchive className="w-3 h-3 mr-1" />
                  {item.zip_files.length} ZIP
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {item.tags?.slice(0, 2).map((tag, index) => (
                <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {item.tags?.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{item.tags.length - 2}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>

        <div className="p-5 pt-0">
          <div className="flex gap-2 pt-2 border-t border-slate-100" onClick={handleActionClick}>
            <Button
              onClick={handleCopy}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600"
              size="sm"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Gekopieerd!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Kopieer
                </>
              )}
            </Button>
            <Link to={createPageUrl(`EditItem?id=${item.id}`)} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Edit className="w-4 h-4 mr-2" />
                Bewerk
              </Button>
            </Link>
            <Button
              variant="outline"
              size="icon"
              onClick={() => deleteMutation.mutate(item.id)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}