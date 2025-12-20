import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function InlineEditableText({ 
  blockKey, 
  value, 
  isAdmin, 
  editMode, 
  multiline = false,
  className = "",
  as: Component = "span"
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (newValue) => {
      const user = await base44.auth.me();
      
      // Check if block exists
      const existing = await base44.entities.FeatureContentBlock.filter({ 
        key: blockKey, 
        page: "features" 
      });

      if (existing && existing.length > 0) {
        // Update existing
        return await base44.entities.FeatureContentBlock.update(existing[0].id, {
          value: newValue,
          updated_by: user?.email || user?.id
        });
      } else {
        // Create new
        return await base44.entities.FeatureContentBlock.create({
          key: blockKey,
          page: "features",
          value: newValue,
          updated_by: user?.email || user?.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureContentBlocks'] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsEditing(false);
      }, 1500);
      toast.success("Saved");
    },
    onError: (error) => {
      toast.error(`Save failed: ${error.message}`);
    }
  });

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setIsEditing(false);
      setDraft(value);
      return;
    }

    setIsSaving(true);
    try {
      await saveMutation.mutateAsync(trimmed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline && inputRef.current.setSelectionRange) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [isEditing, multiline]);

  // Non-admin or not in edit mode: plain text
  if (!isAdmin || !editMode) {
    return <Component className={className}>{value}</Component>;
  }

  // Admin in edit mode but not actively editing this block
  if (!isEditing) {
    return (
      <Component 
        className={cn(
          "cursor-pointer hover:outline hover:outline-2 hover:outline-indigo-400 hover:outline-offset-2 rounded px-1 transition-all",
          className
        )}
        onClick={() => {
          setDraft(value);
          setIsEditing(true);
        }}
        title="Click to edit"
      >
        {value}
      </Component>
    );
  }

  // Actively editing
  return (
    <Component className={cn("inline-flex items-center gap-2 flex-wrap", className)}>
      {multiline ? (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="border-2 border-indigo-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-600 w-full min-h-[80px] text-base"
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && e.ctrlKey) handleSave();
          }}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="border-2 border-indigo-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-600 w-full text-base"
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter') handleSave();
          }}
        />
      )}
      
      {isSaving ? (
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
      ) : showSuccess ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <>
          <button
            onClick={handleSave}
            className="p-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            title="Save (Enter)"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </Component>
  );
}