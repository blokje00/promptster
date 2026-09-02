import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import * as pageViews from "@/api/pageViews";
import { useAuth } from "@/lib/AuthContext";

/**
 * Client-side page view tracker
 * Records page views, time on page, and navigation patterns.
 * Mounted app-wide (see Layout.jsx), but only writes a PageView row when the
 * visitor has accepted the cookie banner (localStorage 'cookie_consent' ===
 * 'accepted', set by CookieConsent.jsx) — no consent, no tracking call.
 * Reads the signed-in user from useAuth() instead of calling base44.auth.me()
 * on every navigation, since that hook already caches the ['authUser'] query.
 */
export default function PageViewTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const userRef = useRef(user);
  const pageStartTime = useRef(null);
  const sessionId = useRef(null);
  const lastPageName = useRef(null);

  // Keep the latest user available to the (non-reactive) recordPageView calls
  // below without re-running the page-change effect when it changes.
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Initialize session ID once on mount
  useEffect(() => {
    if (!sessionId.current) {
      sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  // Track page changes and time on page
  useEffect(() => {
    const hasConsent = localStorage.getItem('cookie_consent') === 'accepted';
    const currentPage = getPageName(location.pathname);

    // Record time spent on previous page
    if (hasConsent && pageStartTime.current && lastPageName.current && sessionId.current) {
      const timeOnPage = Math.floor((Date.now() - pageStartTime.current) / 1000);
      recordPageView(lastPageName.current, timeOnPage, sessionId.current, userRef.current);
    }

    // Set new page start time
    pageStartTime.current = Date.now();
    lastPageName.current = currentPage;

    // Track exit (when user leaves the page)
    const handleBeforeUnload = () => {
      if (hasConsent && pageStartTime.current && lastPageName.current) {
        const timeOnPage = Math.floor((Date.now() - pageStartTime.current) / 1000);
        // Use sendBeacon for reliable tracking on page exit
        const data = JSON.stringify({
          page_name: lastPageName.current,
          session_id: sessionId.current,
          time_on_page: timeOnPage,
          page_url: window.location.href,
          referrer: document.referrer,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          user_agent: navigator.userAgent
        });
        navigator.sendBeacon('/api/track-pageview', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location]);

  return null;
}

/**
 * Extract page name from pathname
 */
function getPageName(pathname) {
  const page = pathname.split('/').filter(Boolean)[0] || 'Dashboard';
  return page.charAt(0).toUpperCase() + page.slice(1);
}

/**
 * Record page view to database. `user` is whatever useAuth() currently has
 * cached (may be null for an anonymous visit) — no per-navigation auth call.
 */
async function recordPageView(pageName, timeOnPage, sessionIdValue, user) {
  try {
    await pageViews.create({
      user_id: user?.id || null,
      user_email: user?.email || null,
      session_id: sessionIdValue,
      page_name: pageName,
      page_url: window.location.href,
      referrer: document.referrer,
      time_on_page: timeOnPage,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('[PageViewTracker] Failed to record page view:', error);
  }
}