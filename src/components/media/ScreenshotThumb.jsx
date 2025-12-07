import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Copy, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ScreenshotThumb({ screenshotId, onRemove, showCopyEmbed = true }) {
  const { data: asset, isLoading } = useQuery({
    queryKey: ['screenshot', screenshotId],
    queryFn: async () => {
      const assets = await base44.entities.ScreenshotAsset.filter({ id: screenshotId });
      return assets?.[0] || null;
    },
    enabled: !!screenshotId,
  });

  const handleCopyEmbed = () => {
    if (asset?.public_url) {
      const markdown = `![Screenshot](${asset.public_url})`;
      navigator.clipboard.writeText(markdown);
      toast.success("Markdown embed copied");
    }
  };

  if (isLoading) {
    return (
      <div className="w-20 h-20 bg-slate-100 rounded border flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="relative group">
      <img 
        src={asset.public_url} 
        alt={asset.filename}
        className="w-20 h-20 rounded border object-cover"
      />
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
            onClick={() => onRemove(screenshotId)}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}