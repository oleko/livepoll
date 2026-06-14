import { test, expect } from "@playwright/test";

test.describe("Join page", () => {
  test("invalid code shows not-found message", async ({ page }) => {
    await page.goto("/join/INVALID");
    await expect(page.getByText("Мероприятие не найдено")).toBeVisible();
  });

  test("lowercase code is normalised and shows not-found", async ({ page }) => {
    await page.goto("/join/invalid");
    await expect(page.getByText("Мероприятие не найдено")).toBeVisible();
  });
});
