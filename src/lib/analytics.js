import posthog from 'posthog-js';

// PostHog Analytics Configuration
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.posthog.com';

export const initAnalytics = () => {
  if (POSTHOG_KEY && typeof window !== 'undefined') {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      // Enable session recording (optional)
      session_recording: {
        recordCrossOriginIframes: true,
      },
      // Respect DNT
      respect_dnt: true,
    });
  }
};

// Track custom events
export const trackEvent = (eventName, properties = {}) => {
  if (posthog.__loaded) {
    posthog.capture(eventName, properties);
  }
};

// Identify user
export const identifyUser = (userId, traits = {}) => {
  if (posthog.__loaded) {
    posthog.identify(userId, traits);
  }
};

// Track page views
export const trackPageView = (pageName, properties = {}) => {
  if (posthog.__loaded) {
    posthog.capture('$pageview', {
      page_name: pageName,
      ...properties,
    });
  }
};

// Reset analytics on logout
export const resetAnalytics = () => {
  if (posthog.__loaded) {
    posthog.reset();
  }
};

export default posthog;
