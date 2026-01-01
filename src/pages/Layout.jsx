import React, { useEffect } from "react";
import Header from "../components/layout/Header";
import { LanguageProvider } from "../components/i18n/LanguageContext";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import CookieConsent from "../components/auth/CookieConsent";
import PageViewTracker from "../components/analytics/PageViewTracker";

import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Layout({ children }) {
  useEffect(() => {
    const iconUrl = "https://base44.app/api/apps/68f4bcd57ca6479c7acf2f47/files/public/68f4bcd57ca6479c7acf2f47/495110831_Promptsterbeta.png";
    
    // Favicon
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = iconUrl;

    // Apple Touch Icon
    let appleLink = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.getElementsByTagName('head')[0].appendChild(appleLink);
    }
    appleLink.href = iconUrl;
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <PageViewTracker />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors">
          <style>{`
            :root {
              --primary: #6366f1;
              --primary-dark: #4f46e5;
            }
          `}</style>

          <Header />

          <main>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>

          <CookieConsent />
          </div>
          </LanguageProvider>
          </ThemeProvider>
          );
          }