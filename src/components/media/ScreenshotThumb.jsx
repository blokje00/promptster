import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ScreenshotThumb({ screenshotId, onRemove, showCopyEmbed = true }) {
  // screenshotId is now actually a direct URL string
  const imageUrl = screenshotId;

  // Check if it's a valid URL
  const isValidUrl = imageUrl && (
    imageUrl.startsWith('http://') || 
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('blob:')
  );

  const handleCopyEmbed = (e) => {
    e.stopPropagation();
    if (imageUrl) {
      const markdown = `![Screenshot](${imageUrl})`;
      navigator.clipboard.writeText(markdown);
      toast.success("Markdown embed copied");
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(screenshotId);
    }
  };

  if (!isValidUrl) {
    return null;
  }

  return (
    <div className="relative group flex-shrink-0">
      <Dialog>
        <DialogTrigger asChild>
          <img 
            src={imageUrl} 
            alt="Screenshot"
            className="w-20 h-20 rounded border object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        </DialogTrigger>
        <DialogContent className="max-w-4xl p-2">
          <img
            src={imageUrl}
            alt="Screenshot full size"
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
        {showCopyEmbed && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
            onClick={handleCopyEmbed}
          >
            <Copy className="w-3 h-3" />
          </Button>
        )}
        {onRemove && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white hover:text-white hover:bg-red-500/80"
            onClick={handleRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}