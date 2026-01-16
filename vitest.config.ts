import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [["tests/unit/**/*.test.js", "jsdom"]],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"]
    }
  }
});
