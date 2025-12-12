import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

/**
 * Cookie Consent Banner - GDPR compliant
 * Shows only to first-time visitors, stores preference in localStorage
 */
export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem('cookie_consent');
    const consentExpiry = localStorage.getItem('cookie_consent_expiry');
    
    // Check if consent has expired (30 days)
    const now = new Date().getTime();
    if (hasConsented && consentExpiry && now < parseInt(consentExpiry)) {
      // Consent is valid, don't show banner
      return;
    }
    
    // Show banner if no consent or expired
    if (!hasConsented || !consentExpiry || now >= parseInt(consentExpiry)) {
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    const expiryTime = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30 days
    localStorage.setItem('cookie_consent', 'accepted');
    localStorage.setItem('cookie_consent_expiry', expiryTime.toString());
    setShowBanner(false);
  };

  const handleDecline = () => {
    const expiryTime = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30 days
    localStorage.setItem('cookie_consent', 'declined');
    localStorage.setItem('cookie_consent_expiry', expiryTime.toString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
              <Cookie className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              We use cookies
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We use essential cookies to ensure our website functions properly and optional cookies to improve your experience. 
              By clicking "Accept", you consent to our use of cookies. Learn more in our{" "}
              <a href="/Legal" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                Privacy Policy
              </a>.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <Button
              onClick={handleDecline}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              Accept Cookies
            </Button>
          </div>

          {/* Close button (mobile) */}
          <button
            onClick={handleDecline}
            className="absolute top-3 right-3 sm:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}