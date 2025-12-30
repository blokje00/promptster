import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import posthog from 'posthog-js';

// Initialize PostHog if key is available
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    capture_pageview: false, // We'll handle this manually
  });
}

/**
 * Track time spent on a specific element or page section
 */
export function useTimeTracking(elementName) {
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const startTime = startTimeRef.current;

    return () => {
      const timeSpent = (Date.now() - startTime) / 1000; // in seconds
      if (import.meta.env.VITE_POSTHOG_KEY) {
        posthog.capture('time_on_element', {
          element: elementName,
          duration_seconds: timeSpent,
        });
      }
    };
  }, [elementName]);
}

/**
 * Track clicks with custom event data
 */
export function useClickTracking() {
  const trackClick = (eventName, properties = {}) => {
    if (import.meta.env.VITE_POSTHOG_KEY) {
      posthog.capture(eventName, properties);
    }
  };

  return { trackClick };
}

/**
 * Track when an element enters the viewport
 * Uses react-intersection-observer
 */
export function useViewportTracking(elementName, options = {}) {
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true,
    ...options,
  });

  useEffect(() => {
    if (inView && import.meta.env.VITE_POSTHOG_KEY) {
      posthog.capture('element_viewed', {
        element: elementName,
      });
    }
  }, [inView, elementName]);

  return { ref, inView };
}

/**
 * Track page views
 */
export function usePageTracking(pageName) {
  useEffect(() => {
    if (import.meta.env.VITE_POSTHOG_KEY) {
      posthog.capture('$pageview', {
        page: pageName,
      });
    }
  }, [pageName]);
}