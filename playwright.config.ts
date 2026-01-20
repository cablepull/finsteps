import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: ["**/playwright/**/*.test.{js,ts}", "**/e2e/**/*.spec.ts", "debug/**/*.spec.ts"],
  timeout: 10_000,
  expect: {
    timeout: 5_000,
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01
    }
  },
  use: {
    viewport: { width: 1280, height: 720 }
  },
  // Start a dev server before running tests
  webServer: {
    command: 'npx serve -p 5173',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
