import { defineConfig, devices } from "@playwright/test"

// Integration tests use the actual published Framer project. No local server or mocks.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "framer-published-carousel-layout.spec.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 2,
  retries: 0,
  use: {
    baseURL: process.env.FRAMER_SITE_URL ?? "https://adaptable-squash-368743.framer.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
})
