import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Inline editor component for Features page blocks
 * Shows pencil icon on hover, allows editing content in place
 */
export default function FeatureInlineEditor({ blockKey, currentContent, className = "" }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentContent || "");

  const updateMutation = useMutation({
    mutationFn: async (content) => {
      const blocks = await base44.entities.FeatureBlock.filter({ block_key: blockKey });
      if (blocks && blocks.length > 0) {
        return base44.entities.FeatureBlock.update(blocks[0].id, { content });
      } else {
        return base44.entities.FeatureBlock.create({
          block_key: blockKey,
          content,
          content_type: "text",
          order: 0
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureBlocks'] });
      toast.success("Content updated");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Failed to update content");
    }
  });

  const handleSave = () => {
    if (editValue.trim()) {
      updateMutation.mutate(editValue);
    }
  };

  const handleCancel = () => {
    setEditValue(currentContent || "");
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className={`group relative inline-block ${className}`}>
        <span>{currentContent}</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
        >
          <Pencil className="w-3 h-3 text-indigo-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Textarea
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="min-h-[40px] text-sm"
        autoFocus
      />
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="h-8 w-8 text-green-600 hover:bg-green-50"
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
          className="h-8 w-8 text-red-600 hover:bg-red-50"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}