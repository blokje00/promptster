import React from "react";
import Header from "./components/layout/Header";
import { LanguageProvider } from "./components/i18n/LanguageContext";

export default function Layout({ children }) {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <style>{`
          :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
          }
        `}</style>
        
        <Header />
        
        <main>
          {children}
        </main>
      </div>
    </LanguageProvider>
  );
}