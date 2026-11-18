const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 45000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5183",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node start-server.cjs",
      url: "http://localhost:5055/healthz",
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command: "npm --prefix ../project run dev -- --port 5183 --strictPort",
      url: "http://localhost:5183",
      env: { VITE_BACKEND_URL: "http://localhost:5055" },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
