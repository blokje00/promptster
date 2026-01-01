import React from "react";
import { isInAppBrowser } from "@/components/lib/isInAppBrowser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink } from "lucide-react";

/**
 * Blocks Google OAuth in in-app browsers (LinkedIn, Facebook, etc.)
 * Shows clear instructions to open in Safari/Chrome instead
 */
export default function InAppBrowserGuard({ children }) {
  const blocked = isInAppBrowser();

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

          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              ✅ Oplossing:
            </p>
            <p>
              Open Promptster in <strong>Safari</strong> of <strong>Chrome</strong> om veilig in te loggen.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => {
                // Force open in external browser
                window.location.href = "https://promptster.app";
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in browser
            </Button>
            
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              Of kopieer de URL en plak in Safari/Chrome
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}