import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Требует staging-проекта и пишет в БД — живёт в playwright.qa.config.ts,
  // чтобы обычный прогон (и CI) его не подхватывал.
  testIgnore: /poll-types.spec.ts/,
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    locale: "ru",
    extraHTTPHeaders: { "Accept-Language": "ru" },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
