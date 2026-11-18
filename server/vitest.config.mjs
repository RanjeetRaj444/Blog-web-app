import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    hookTimeout: 180000,
    testTimeout: 30000,
    fileParallelism: false,
    env: { JWT_SECRET: "test-secret", GROQ_API_KEY: "test-key" },
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["app.js", "routes/**", "middleware/**", "models/**", "utils/**"],
      thresholds: { lines: 85, functions: 85, statements: 85, branches: 70 },
    },
  },
});
