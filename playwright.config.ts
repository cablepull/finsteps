import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: ["**/playwright/**/*.test.{js,ts}", "**/e2e/**/*.spec.ts"],
  timeout: 60_000,
  expect: {
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01
    }
  },
  use: {
    viewport: { width: 1280, height: 720 }
  }
});
