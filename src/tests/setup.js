import '@testing-library/jest-dom';
import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatisch cleanup na elke test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (nodig voor responsive componenten)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Setup voor Base44 mock indien nodig
beforeAll(() => {
  // Laad test environment variabelen
  process.env.VITE_BASE44_APP_ID = '68f4bcd57ca6479c7acf2f47';
  process.env.VITE_BASE44_SERVER_URL = 'https://base44.app';
  process.env.VITE_USE_MOCK_DATA = 'true';
});
