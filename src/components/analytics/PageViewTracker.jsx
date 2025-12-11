import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/**
 * Client-side page view tracker
 * Tracks page views, time on page, and navigation
 */
export default function PageViewTracker() {
  const pageStartTime = useRef(null);
  const sessionId = useRef(null);
  const lastPageName = useRef(null);
  
  // Initialize session ID once on mount
  if (!sessionId.current) {
    sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  let location;
  try {
    location = useLocation();
  } catch (error) {
    // Not in Router context, skip tracking
    return null;
  }

  useEffect(() => {
    // Record previous page exit time
    if (lastPageName.current && pageStartTime.current) {
      const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
      
      // Only record if user spent more than 1 second on page
      if (timeOnPage > 1) {
        recordPageView(lastPageName.current, timeOnPage);
      }
    }

    // Set new page start time
    pageStartTime.current = Date.now();
    lastPageName.current = getPageName(location.pathname);

    // Cleanup: record time when user leaves/closes tab
    const handleBeforeUnload = () => {
      if (lastPageName.current && pageStartTime.current) {
        const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
        if (timeOnPage > 1) {
          // Use sendBeacon for reliable tracking on page unload
          navigator.sendBeacon?.('/api/track-page-view', JSON.stringify({
            page_name: lastPageName.current,
            time_on_page: timeOnPage,
            session_id: sessionId.current
          }));
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname]);

  const getPageName = (pathname) => {
    // Extract page name from pathname
    const parts = pathname.split('/').filter(Boolean);
    return parts.length > 0 ? parts[0] : 'Dashboard';
  };

  const recordPageView = async (pageName, timeOnPage = 0) => {
    try {
      const user = await base44.auth.me().catch(() => null);

      await base44.entities.PageView.create({
        session_id: sessionId.current,
        page_name: pageName,
        page_url: window.location.href,
        referrer: document.referrer,
        time_on_page: timeOnPage,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        user_agent: navigator.userAgent,
        user_id: user?.id,
        user_email: user?.email
      });
    } catch (error) {
      // Silent fail - don't interrupt user experience
      console.debug('[Analytics] Page view tracking failed:', error.message);
    }
  };

  return null; // This is a logic-only component
}