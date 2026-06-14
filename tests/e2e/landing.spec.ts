import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows hero heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Аудитория говорит");
  });

  test('"Начать бесплатно" links to /auth/register', async ({ page }) => {
    await page.goto("/");
    const btn = page.getByRole("link", { name: /Начать бесплатно/ }).first();
    await expect(btn).toHaveAttribute("href", "/auth/register");
  });

  test('"Войти" links to /auth/login', async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /Войти/ }).first();
    await expect(link).toHaveAttribute("href", "/auth/login");
  });
});
