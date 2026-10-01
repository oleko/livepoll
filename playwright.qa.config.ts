import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";

/**
 * The staging-only config for the live QA run (tests/e2e/poll-types.spec.ts).
 *
 * Separate from playwright.config.ts for two reasons. First, these tests write
 * to a database, so they must never be pointed at production — the guard below
 * repeats the one in the harness, because a config is the easiest place to get
 * this wrong. Second, `NEXT_PUBLIC_*` values are inlined into the bundle, so
 * the app under test has to be started with the staging keys in its own
 * environment; the default config starts a server with .env.local, which is
 * production.
 *
 * Run: npm run qa:e2e
 */
const PRODUCTION_REF = "ikucuostgfsmetztzzup";

function loadStagingEnv(): Record<string, string> {
  if (!existsSync(".env.staging")) {
    throw new Error(
      "Нет .env.staging — создайте его с ключами ОТДЕЛЬНОГО проекта Supabase (см. DEPLOY.md §10.5)."
    );
  }
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.staging", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (url.includes(PRODUCTION_REF)) {
    throw new Error("ОТКАЗ: .env.staging указывает на боевой проект. Тесты пишут и удаляют данные.");
  }
  if (!url || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "В .env.staging нужны NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY и SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return env;
}

const stagingEnv = loadStagingEnv();

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /poll-types\.spec\.ts/,
  // Seeding plus a realtime resync is slower than a page load; the per-test
  // waits are explicit, this is just the outer bound.
  timeout: 90_000,
  // The suite shares one seeded session, so the tests must not race each other
  // over which poll is active.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    locale: "ru",
    extraHTTPHeaders: { "Accept-Language": "ru" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // dev, not build+start: NEXT_PUBLIC_* are inlined, and dev picks them up
    // from this environment without a full production build.
    command: "npx next dev --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...stagingEnv,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
    },
  },
});
