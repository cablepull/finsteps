import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  use: {
    viewport: { width: 800, height: 600 },
  },
});
