import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SaveButton - Standaard save button component met visuele feedback
 */
export function SaveButton({
  isSaving = false,
  isDirty = true,
  isSuccess = false,
  label = "Opslaan",
  savingLabel = "Opslaan...",
  successLabel = "Opgeslagen!",
  onClick,
  disabled = false,
  className = "",
  variant = "default",
  size = "default",
  showIcon = true,
  ...props
}) {
  const isDisabled = disabled || isSaving || (!isDirty && !isSaving);

  const getIcon = () => {
    if (isSaving) {
      return <Loader2 className="w-4 h-4 mr-2 animate-spin" />;
    }
    if (isSuccess) {
      return <Check className="w-4 h-4 mr-2 text-green-500" />;
    }
    return showIcon ? <Save className="w-4 h-4 mr-2" /> : null;
  };

  const getLabel = () => {
    if (isSaving) return savingLabel;
    if (isSuccess) return successLabel;
    return label;
  };

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className={cn(
        "transition-all",
        isSuccess && "bg-green-600 hover:bg-green-700",
        className
      )}
      {...props}
    >
      {getIcon()}
      {getLabel()}
    </Button>
  );
}

export default SaveButton;