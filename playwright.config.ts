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
    // Serve repo root so tests can load fixtures and source modules
    command: 'npx serve -p 5173 .',
    // IMPORTANT: use trailing slash so relative assets resolve correctly
    url: 'http://localhost:5173/examples/editor/',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
