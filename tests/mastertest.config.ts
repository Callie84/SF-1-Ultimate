import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 15000,
    reporters: ['verbose'],
    sequence: {
      concurrent: false,
    },
  },
});
