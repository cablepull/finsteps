import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: ["**/playwright/**/*.test.{js,ts}", "**/e2e/**/*.spec.ts"],
  timeout: 10_000,
  expect: {
    timeout: 5_000,
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01
    }
  },
  use: {
    viewport: { width: 1280, height: 720 }
  }
});
