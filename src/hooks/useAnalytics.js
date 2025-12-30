import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { trackEvent } from '@/lib/analytics';

/**
 * Hook to track when an element comes into view
 * Useful for tracking scroll depth and content visibility
 */
export function useViewportTracking(elementName, options = {}) {
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true,
    ...options,
  });

  useEffect(() => {
    if (inView) {
      trackEvent('element_viewed', {
        element: elementName,
        timestamp: new Date().toISOString(),
      });
    }
  }, [inView, elementName]);

  return { ref, inView };
}

/**
 * Hook to track time spent on page
 */
export function useTimeTracking(pageName) {
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000); // in seconds
      trackEvent('time_on_page', {
        page: pageName,
        seconds: timeSpent,
      });
    };
  }, [pageName]);
}

/**
 * Hook to track button clicks
 */
export function useClickTracking() {
  const trackClick = (buttonName, additionalProps = {}) => {
    trackEvent('button_click', {
      button: buttonName,
      ...additionalProps,
    });
  };

  return { trackClick };
}
