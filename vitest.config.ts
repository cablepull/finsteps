import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,js}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"]
    }
  }
});
