import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import os from 'node:os';
import path from 'node:path';

const webNodeModules = path.join(__dirname, 'apps/web/node_modules');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'apps/web/src'),
      react: path.join(webNodeModules, 'react'),
      'react-dom': path.join(webNodeModules, 'react-dom'),
      'react/jsx-dev-runtime': path.join(webNodeModules, 'react/jsx-dev-runtime.js'),
      'react/jsx-runtime': path.join(webNodeModules, 'react/jsx-runtime.js'),
    },
  },
  test: {
    include: ['apps/**/*.test.ts', 'apps/**/*.test.tsx'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    environmentMatchGlobs: [['apps/web/**/*.test.tsx', 'jsdom']],
    env: {
      ABYSSAN_HOME: path.join(os.tmpdir(), 'abyssan-vitest-home'),
    },
  },
});
