import { expect, test } from '@playwright/test';
import { createLearner } from './learner';
import { startInvestigation } from './start-investigation';

test('the archived workshop postcard and access form fit the narrow Canvas view', async ({
  page,
  browserName,
}) => {
  const blockedResources: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /content security policy/i.test(message.text()))
      blockedResources.push(message.text());
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/archive/week-one');
  const postcard = page.getByRole('img', { name: /workshop/i });
  await expect(postcard).toBeVisible({ timeout: 2000 });
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('600 16px "Course Nunito"'))).toBe(true);
  expect(blockedResources).toEqual([]);
  expect(
    await postcard.evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
  ).toBe(true);
  const connect = page.getByRole('button', { name: 'Connect', exact: true });
  await expect(connect).toHaveCSS('background-color', 'rgb(25, 200, 185)');
  await page.getByLabel('Access code').focus();
  // macOS WebKit uses Option-Tab to include buttons in keyboard navigation.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(connect).toBeFocused();
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('the illustrated supply table keeps its action when 3D is unavailable', async ({ page, request }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply(getContext, canvas, args) {
        return String(args[0]).includes('webgl') ? null : Reflect.apply(getContext, canvas, args);
      },
    });
  });
  await page.goto('/archive/week-one');
  const learner = await createLearner(request);
  await page.getByLabel('Access code').fill(learner.code);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await startInvestigation(page);
  const room = page.getByRole('region', { name: 'Interactive room' });
  await expect(room.getByRole('group', { name: 'Supply table', exact: true })).toBeVisible();
  await expect(room.locator('figcaption')).toHaveText('Supply table · Station illustration');
  const still = room.getByRole('img', { name: /Eunseo and Yinqi/ });
  await expect(still).toBeVisible();
  await expect.poll(() => still.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const inspect = room.getByRole('button', { name: 'Inspect practice record' });
  await inspect.hover();
  await expect(inspect).toHaveCSS('color', 'rgb(56, 45, 32)', { timeout: 1500 });
  await expect(inspect.locator('[aria-hidden]')).toHaveCSS('color', 'rgb(56, 45, 32)');
  await inspect.focus();
  await page.keyboard.press('Enter');
  await expect(room.getByRole('button', { name: 'Inspect fresh attempt' })).toBeVisible();
});

test('a failed notebook load offers a full-size retry and restores the quest', async ({ page }) => {
  await page.route(
    '**/api/v1/quests/w01/progress',
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Please reconnect to the center.' }),
      }),
    { times: 1 },
  );
  await page.goto('/archive/week-one?view=text');
  await page.getByRole('button', { name: 'Use demo learner' }).click();
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible({ timeout: 2000 });
  expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await retry.click();
  await expect(page.getByRole('button', { name: 'How this works' })).toBeVisible();
});

test('the Week 1 entrance keeps equal outer margins as the window changes height', async ({ page }) => {
  await page.setViewportSize({ width: 1472, height: 957 });
  await page.goto('/archive/week-one');
  const header = page.locator('.arrival-mast');
  const card = page.getByRole('region', { name: 'Week 1 entrance' });
  await expect(card.getByLabel('Access code')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const height of [957, 780, 1100]) {
    await page.setViewportSize({ width: 1472, height });
    const top = (await header.boundingBox())!.y;
    const box = (await card.boundingBox())!;
    const bottom = height - (box.y + box.height);
    expect(top).toBeGreaterThanOrEqual(8);
    expect(top).toBeLessThanOrEqual(24);
    expect(Math.abs(top - bottom)).toBeLessThan(1);
  }

  await page.setViewportSize({ width: 320, height: 480 });
  const lastItem = card.locator('figcaption');
  await lastItem.scrollIntoViewIfNeeded();
  await expect(lastItem).toBeInViewport();
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('instructor and planned quest pages share equal outer gutters', async ({ page }) => {
  await page.setViewportSize({ width: 1472, height: 957 });
  const routes = [
    ['/instructor', '.page-heading', '.login'],
    ['/quests/w03', '.page-heading', '.planned'],
  ] as const;
  for (const [url, first, last] of routes) {
    await page.goto(url);
    const header = page.locator(first);
    const end = page.locator(last);
    await expect(end).toBeVisible();
    for (const height of [780, 1100]) {
      await page.setViewportSize({ width: 1472, height });
      const top = (await header.boundingBox())!.y;
      const box = (await end.boundingBox())!;
      expect(top).toBeGreaterThanOrEqual(8);
      expect(top).toBeLessThanOrEqual(24);
      expect(Math.abs(height - box.y - box.height - top), url + ' bottom gutter').toBeLessThan(1);
    }
  }
});

test('the landing page centers its unboxed title and keeps the week list compact', async ({ page }) => {
  await page.goto('/');
  const title = page.getByRole('heading', { name: 'AI in Education' });
  const header = page.locator('.course-heading');
  const weeks = page.getByRole('navigation', { name: 'Course weeks' });
  const questLinks = weeks.getByRole('link', { name: /^Week \d+ ·/ });
  await expect(questLinks).toHaveCount(15);
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1472, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const titleBox = (await title.boundingBox())!;
    expect(Math.abs(titleBox.x + titleBox.width / 2 - width / 2)).toBeLessThan(1);
    const grid = (await weeks.boundingBox())!;
    const lastCard = (await weeks.locator('li').last().boundingBox())!;
    expect(grid.y + grid.height - lastCard.y - lastCard.height).toBeLessThan(1);
    await expect(header).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(weeks).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
  const lastQuest = questLinks.last();
  await lastQuest.scrollIntoViewIfNeeded();
  await expect(lastQuest).toBeInViewport();
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});
