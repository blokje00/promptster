import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * Client-side page view tracker
 * Records page views, time on page, and navigation patterns
 * Only used on Admin Analytics page
 */
export default function PageViewTracker() {
  const location = useLocation();
  const pageStartTime = useRef(null);
  const sessionId = useRef(null);
  const lastPageName = useRef(null);
  
  // Initialize session ID once on mount
  useEffect(() => {
    if (!sessionId.current) {
      sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  // Track page changes and time on page
  useEffect(() => {
    const currentPage = getPageName(location.pathname);
    
    // Record time spent on previous page
    if (pageStartTime.current && lastPageName.current) {
      const timeOnPage = Math.floor((Date.now() - pageStartTime.current) / 1000);
      recordPageView(lastPageName.current, timeOnPage);
    }

    // Set new page start time
    pageStartTime.current = Date.now();
    lastPageName.current = currentPage;

    // Track exit (when user leaves the page)
    const handleBeforeUnload = () => {
      if (pageStartTime.current && lastPageName.current) {
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
 * Record page view to database
 */
async function recordPageView(pageName, timeOnPage) {
  try {
    const user = await base44.auth.me().catch(() => null);
    
    await base44.entities.PageView.create({
      user_id: user?.id || null,
      user_email: user?.email || null,
      session_id: sessionId.current,
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