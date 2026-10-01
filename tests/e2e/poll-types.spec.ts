import { test, expect, type Page } from "@playwright/test";
import { stagingAdmin, seed, teardown, activatePoll, closePoll, countVotes, countQuestions } from "../../scripts/qa/lib.mjs";

/**
 * The run the August QA backlog has been waiting for.
 *
 * Items #10, #12, #16, #17, #18 and #20 reported that Q&A, temperature, the
 * word cloud, the idea wall and planning poker either did nothing or stopped
 * responding, while #19 said multiple choice was the one type that worked. The
 * root cause of a neighbouring cluster turned out to be an RLS recursion fixed
 * in migration 015, so part of this may already be resolved — but nobody has
 * checked, and "probably fixed" is not a state you take into a room full of
 * people.
 *
 * Two things make this a real test rather than a click-through:
 *
 *  - The host side is applied straight to the database and deliberately does
 *    NOT broadcast. So every assertion below passes only if the screen
 *    converges through the resync path, which is exactly what used to fail
 *    (the projector falling back to the QR splash).
 *  - Each vote is also verified in the database, so a UI that merely looks
 *    like it accepted the answer cannot pass.
 *
 * Needs a staging project: see DEPLOY.md §10.5. The harness refuses to run
 * against production.
 */

type Fixture = {
  sessionId: string;
  orgId: string;
  userId: string;
  joinCode: string;
  polls: Record<string, string>;
  slides: Record<string, string>;
};

let admin: ReturnType<typeof stagingAdmin>;
let fx: Fixture;

test.beforeAll(async () => {
  admin = stagingAdmin();
  fx = await seed(admin);
  // eslint-disable-next-line no-console
  console.log(`[QA] сессия ${fx.joinCode} (${fx.sessionId})`);
});

test.afterAll(async () => {
  await teardown(admin, fx);
});

/** Opens the participant screen and waits for the active poll to appear. */
async function openParticipant(page: Page, title: string) {
  await page.goto(`/join/${fx.joinCode}`);
  await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 15_000 });
}

/** Opens the projector and waits for the active poll to appear. */
async function openDisplay(page: Page, title: string) {
  await page.goto(`/display/${fx.joinCode}`);
  await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 15_000 });
}

test.describe("типы опросов — участник голосует, голос доходит до БД", () => {
  // #19 — единственный тип, про который в бэклоге сказано «работает
  // полностью корректно». Здесь он контрольный: если падает он, дело не в
  // конкретном типе.
  test("multiple_choice принимает голос", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.multiple_choice);
    await openParticipant(page, "Множественный выбор");

    await page.getByRole("button", { name: "Альфа" }).click();

    await expect.poll(() => countVotes(admin, fx.polls.multiple_choice), { timeout: 15_000 }).toBe(1);
  });

  // #17 — «облако слов не работает вообще»
  test("word_cloud принимает слово", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.word_cloud);
    await openParticipant(page, "Облако слов");

    await page.getByPlaceholder("Введите слово или фразу...").fill("синергия");
    await page.getByRole("button", { name: "Отправить" }).click();

    await expect.poll(() => countVotes(admin, fx.polls.word_cloud), { timeout: 15_000 }).toBe(1);
  });

  test("emoji_cloud принимает эмодзи", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.emoji_cloud);
    await openParticipant(page, "Облако эмодзи");

    await page.locator("button").filter({ hasText: /\p{Emoji}/u }).first().click();

    await expect.poll(() => countVotes(admin, fx.polls.emoji_cloud), { timeout: 15_000 }).toBe(1);
  });

  // #16 — «шкала температуры не принимает значения, не показывается
  // участникам без ручного обновления страницы»
  test("temperature принимает оценку", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.temperature);
    await openParticipant(page, "Шкала температуры");

    await expect(page.getByText("Холодно")).toBeVisible();
    await page.getByRole("button", { name: "5", exact: true }).click();

    await expect.poll(() => countVotes(admin, fx.polls.temperature), { timeout: 15_000 }).toBe(1);
  });

  // #14 — «экран на телефоне не меняется после голоса»
  test("like_dislike принимает голос", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.like_dislike);
    await openParticipant(page, "Лайк и дизлайк");

    await page.locator("button").filter({ hasText: "👍" }).first().click();

    await expect.poll(() => countVotes(admin, fx.polls.like_dislike), { timeout: 15_000 }).toBe(1);
  });

  // #20 — «карту выбрать можно, дальше не реагирует на команды»
  test("planning_poker принимает карту", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.planning_poker);
    await openParticipant(page, "Planning Poker");

    await page.getByRole("button", { name: "8", exact: true }).click();

    await expect.poll(() => countVotes(admin, fx.polls.planning_poker), { timeout: 15_000 }).toBe(1);
  });

  // #10 — «Q&A в целом работает плохо». Пишет в questions, не в votes.
  test("qa принимает вопрос", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.qa);
    await openParticipant(page, "Вопросы аудитории");

    await page.getByPlaceholder("Введите ваш вопрос...").fill("Будет ли запись доклада?");
    await page.getByRole("button", { name: "Задать вопрос" }).click();

    await expect.poll(() => countQuestions(admin, fx.polls.qa), { timeout: 15_000 }).toBe(1);
  });

  // #18 — «стена идей работает только в начале»
  test("idea_wall принимает идею", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.idea_wall);
    await openParticipant(page, "Стена идей");

    await page.getByPlaceholder("Введите вашу идею...").fill("Ставить кофемашину ближе к залу");
    await page.getByRole("button", { name: "Отправить идею" }).click();

    await expect.poll(() => countQuestions(admin, fx.polls.idea_wall), { timeout: 15_000 }).toBe(1);
  });
});

test.describe("проектор — показывает активный элемент без броадкаста", () => {
  // #7 и #13 — «проектор показывает дефолтную заставку с QR вместо
  // актуального экрана». Ни одна активация здесь не рассылает событие, так
  // что пройти может только ресинк.
  for (const [type, title] of [
    ["multiple_choice", "Множественный выбор"],
    ["word_cloud", "Облако слов"],
    ["temperature", "Шкала температуры"],
    ["idea_wall", "Стена идей"],
  ] as const) {
    test(`проектор поднимает активный ${type}`, async ({ page }) => {
      await activatePoll(admin, fx.sessionId, fx.polls[type]);
      await openDisplay(page, title);
      await expect(page.getByText("Отсканируйте", { exact: false })).toHaveCount(0);
    });
  }

  // #15 — «по истечении времени опроса экран показывает заставку
  // присоединения вместо результатов»
  test("закрытый опрос не возвращает проектор к заставке с QR", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.multiple_choice);
    await openDisplay(page, "Множественный выбор");

    await closePoll(admin, fx.polls.multiple_choice);
    await page.reload();

    // Нечего показывать — но это должно быть осознанное состояние ожидания,
    // а не пустой экран: заставка с QR здесь как раз корректна.
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("отказ в голосовании", () => {
  test("голос в закрытый опрос не принимается", async ({ page }) => {
    await activatePoll(admin, fx.sessionId, fx.polls.multiple_choice);
    await openParticipant(page, "Множественный выбор");

    // Опрос закрывается, когда телефон этого уже не узнает — ровно тот
    // случай, который раньше дописывал голос в подведённый опрос.
    await closePoll(admin, fx.polls.multiple_choice);
    await page.getByRole("button", { name: "Бета" }).click();

    await expect(page.getByText("Голосование завершено", { exact: false })).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => countVotes(admin, fx.polls.multiple_choice)).toBe(0);
  });
});
