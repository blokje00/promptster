import posthog from 'posthog-js';

// Initialize PostHog if key is available
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
  });
}

/**
 * Track custom events
 */
export function trackEvent(eventName, properties = {}) {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.capture(eventName, properties);
  } else {
    console.log('[Analytics]', eventName, properties);
  }
}

/**
 * Identify a user
 */
export function identifyUser(userId, traits = {}) {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.identify(userId, traits);
  }
}

/**
 * Reset user identity (e.g., on logout)
 */
export function resetUser() {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.reset();
  }
}