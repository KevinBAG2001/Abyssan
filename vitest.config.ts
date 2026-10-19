import { defineConfig } from 'vitest/config';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['apps/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    env: {
      ABYSSAN_HOME: path.join(os.tmpdir(), 'abyssan-vitest-home'),
    },
  },
});
