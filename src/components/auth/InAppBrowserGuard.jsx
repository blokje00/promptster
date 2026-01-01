import React, { useState } from "react";
import { isInAppBrowser } from "@/components/lib/isInAppBrowser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Blocks Google OAuth in in-app browsers (LinkedIn, Facebook, etc.)
 * Shows clear instructions to open in Safari/Chrome instead
 */
export default function InAppBrowserGuard({ children }) {
  const blocked = isInAppBrowser();
  const [copied, setCopied] = useState(false);
  const url = "https://promptster.app";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link gekopieerd! Open Safari en plak de link.");
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error("Kopiëren mislukt. Houd de knop ingedrukt en kies 'Kopieer link'.");
    }
  };

  if (!blocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="max-w-md border-orange-300 dark:border-orange-700 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-xl text-orange-600 dark:text-orange-400">
            Google login werkt niet in de LinkedIn-app
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <p>
            Je opent Promptster vanuit een in-app browser (bijv. LinkedIn). 
            Google staat hier geen veilige login toe.
          </p>

          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg space-y-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              ✅ Methode 1: LinkedIn menu
            </p>
            <p className="text-sm">
              Tik rechtsboven op <strong>⋯</strong> (drie puntjes) → kies <strong>"Open in browser"</strong>
            </p>
          </div>

          <div className="space-y-3">
            <a 
              href={url}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg shadow-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in browser
            </a>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Link gekopieerd!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Kopieer link
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              <strong>Methode 2:</strong> Gebruik "Kopieer link" en plak in Safari/Chrome
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}