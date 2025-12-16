import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Star, Trash2, Edit, Code2, Sparkles, FileText, CheckCircle, MessageSquare, Image as ImageIcon, FileArchive, GitBranch, ClipboardCheck, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import ScreenshotThumb from "../media/ScreenshotThumb";


const typeIcons = {
  prompt: Sparkles,
  code: Code2,
  snippet: FileText
};

const typeColors = {
  prompt: "bg-purple-100 text-purple-700 border-purple-200",
  code: "bg-blue-100 text-blue-700 border-blue-200",
  snippet: "bg-green-100 text-green-700 border-green-200",
  multiprompt: "bg-indigo-100 text-indigo-700 border-indigo-200"
};

const projectColors = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500"
};

export default function ItemCard({ item, project }) {
  const [copied, setCopied] = useState(false);
  const [localTaskChecks, setLocalTaskChecks] = useState(item.task_checks || []);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const TypeIcon = typeIcons[item.type] || FileText;

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Item.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Item deleted');
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) => base44.entities.Item.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const updateTaskChecksMutation = useMutation({
    mutationFn: ({ id, task_checks }) => base44.entities.Item.update(id, { task_checks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const handleToggleTaskCheck = (e, index) => {
    e.stopPropagation();
    const newChecks = [...localTaskChecks];
    // Cycle status: open -> success -> failed -> open
    const currentStatus = newChecks[index].status || (newChecks[index].is_checked ? 'success' : 'open');
    let nextStatus = 'open';
    if (currentStatus === 'open') nextStatus = 'success';
    else if (currentStatus === 'success') nextStatus = 'failed';
    else if (currentStatus === 'failed') nextStatus = 'open';
    
    newChecks[index] = { 
      ...newChecks[index], 
      status: nextStatus,
      is_checked: nextStatus === 'success' // maintain legacy compat
    };
    setLocalTaskChecks(newChecks);
    updateTaskChecksMutation.mutate({ id: item.id, task_checks: newChecks });
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleActionClick = (e) => {
    e.stopPropagation();
  };

  const handleCardClick = () => {
    const hasOpenTasks = item.task_checks?.some(check => check.status !== 'success');
    
    // Task 2: Always navigate to EditItem, with hash anchor
    if (hasOpenTasks) {
      // If open tasks -> scroll to checklist
      navigate(createPageUrl(`EditItem?id=${item.id}#checklist`));
    } else {
      // If all done -> scroll to content
      navigate(createPageUrl(`EditItem?id=${item.id}#content`));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer h-full"
      onClick={handleCardClick}
    >
      <Card className={`h-full overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col bg-white dark:bg-slate-800 ${
        item.is_publish_version ? 'border-2 border-green-400 dark:border-green-500' : 'border-slate-200 dark:border-slate-700'
      }`}>
        <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded-xl ${typeColors[item.type]} border`}>
                <TypeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                {project && (
                  <Badge variant="secondary" className={`mb-1 text-[10px] px-1.5 py-0 h-4 ${projectColors[project.color]} text-white hover:${projectColors[project.color]}`}>
                    {project.name}
                  </Badge>
                )}
                {/* Task 5: Unvalidated Items Count */}
                {(() => {
                   const uncheckedCount = item.task_checks?.filter(c => !c.is_checked).length || 0;
                   if (uncheckedCount > 0) {
                     return (
                       <Badge variant="outline" className="ml-2 mb-1 text-[10px] px-1.5 py-0 h-4 border-orange-300 text-orange-600 bg-orange-50">
                         {uncheckedCount} open
                       </Badge>
                     );
                   }
                   return null;
                })()}
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{item.title}</h3>
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
                          {item.publish_timestamp ? new Date(item.publish_timestamp).toLocaleString('en-US') : 'No date available'}
                        </p>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                  {item.is_pending_check && (
                    <Badge variant="outline" className="bg-orange-50 border-orange-300 text-orange-700 flex-shrink-0">
                      <ClipboardCheck className="w-3 h-3 mr-1" />
                      To check
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {new Date(item.created_date).toLocaleDateString('nl-NL', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
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
          {item.screenshot_ids && item.screenshot_ids.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0">
              {item.screenshot_ids.slice(0, 3).map((id, index) => (
                <ScreenshotThumb key={`${id}-${index}`} screenshotId={id} showCopyEmbed={false} />
              ))}
              {item.screenshot_ids.length > 3 && (
                <div className="w-20 h-20 flex items-center justify-center bg-slate-100 rounded-lg border-2 border-slate-200 text-sm text-slate-600 font-medium">
                  +{item.screenshot_ids.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Task checks for pending multiprompts */}
          {item.is_pending_check && localTaskChecks.length > 0 && (
            <div className="space-y-1 p-2 bg-orange-50 rounded-lg border border-orange-200" onClick={handleActionClick}>
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-medium text-orange-700">Task checklist:</p>
                <span className="text-[10px] text-orange-600">
                  {localTaskChecks.filter(c => c.status === 'success').length}/{localTaskChecks.length}
                </span>
              </div>
              {localTaskChecks.map((check, index) => (
                <HoverCard key={index} openDelay={200}>
                  <HoverCardTrigger asChild>
                    <div 
                      className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer hover:bg-orange-100 ${
                        check.status === 'success' ? 'bg-green-50' : 
                        check.status === 'failed' ? 'bg-red-50' : ''
                      }`}
                      onClick={(e) => handleToggleTaskCheck(e, index)}
                    >
                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        check.status === 'success' ? 'bg-green-500 border-green-500' : 
                        check.status === 'failed' ? 'bg-red-500 border-red-500' : 
                        'border-slate-400 bg-white'
                      }`}>
                        {check.status === 'success' && <CheckCircle className="w-2 h-2 text-white" />}
                        {check.status === 'failed' && <X className="w-2 h-2 text-white" />}
                      </div>
                      <span className={`truncate ${
                        check.status === 'success' ? 'line-through text-green-600' : 
                        check.status === 'failed' ? 'text-red-600' : 
                        'text-slate-700'
                      }`}>
                        {check.task_name}
                      </span>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 p-0 overflow-hidden" align="start" side="right">
                    <div className="bg-slate-50 p-2 border-b flex justify-between items-center">
                      <span className="font-semibold text-xs text-slate-700">Full task description</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className={`text-[10px] ${
                          check.status === 'success' ? 'bg-green-100 text-green-700' :
                          check.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {check.status === 'success' ? 'Success' : check.status === 'failed' ? 'Failed' : 'Open'}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 max-h-60 overflow-y-auto">
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed break-words">
                        {check.full_description || check.task_name}
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          )}

          <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 max-h-48 overflow-auto flex-grow">
            <pre className="text-xs text-slate-300 dark:text-slate-400 font-mono whitespace-pre-wrap break-all">
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
                    <p className="text-sm font-semibold mb-2">Notes</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.notes}</p>
                  </HoverCardContent>
                </HoverCard>
              )}

              {item.screenshot_ids && item.screenshot_ids.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {item.screenshot_ids.length}
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
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700" onClick={handleActionClick}>
            <Button
              onClick={handleCopy}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600"
              size="sm"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
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
                Edit
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