import React from "react";
import { Button } from "@/components/ui/button";
import { Share2, Twitter, Linkedin, Facebook, Mail } from "lucide-react";
import { toast } from "sonner";

/**
 * Social Share Buttons - Share current page URL on social media
 */
export default function SocialShareButtons({ 
  title = "Check out Promptster", 
  description = "AI-powered prompt management for developers",
  showLabel = true
}) {
  const currentUrl = window.location.href;
  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`
  };

  const handleShare = (platform) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    toast.success(`Sharing on ${platform}...`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-sm text-slate-600 dark:text-slate-400 mr-1">Share:</span>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleShare('twitter')}
        className="h-8 w-8 text-slate-600 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
        title="Share on Twitter"
      >
        <Twitter className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleShare('linkedin')}
        className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
        title="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleShare('facebook')}
        className="h-8 w-8 text-slate-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
        title="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleShare('email')}
        className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Share via Email"
      >
        <Mail className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopyLink}
        className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
        title="Copy Link"
      >
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  );
}