import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '*.config.js',
        '*.config.ts',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Deno backend functions import the SDK as `npm:@base44/sdk@x.y.z`.
      // Map that specifier to the installed package so the shared backend
      // utilities (base44/functions/utils/*) can be unit-tested here.
      { find: /^npm:@base44\/sdk(@[\d.]+)?$/, replacement: '@base44/sdk' },
    ],
  },
});
