import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders email and password inputs", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("submit button is present", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("button", { name: /Войти/ })).toBeVisible();
  });
});

test.describe("Auth guard", () => {
  test("accessing /org/anything without auth redirects to login", async ({ page }) => {
    await page.goto("/org/test-slug");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
