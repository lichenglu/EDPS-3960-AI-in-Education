import { expect, test } from '@playwright/test';

test('the handout introduces the cast and opens numbered sources without losing the reader’s place', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/activities/w01.html');
  await expect(page.locator('#crew img')).toHaveCount(0);
  await expect(page.locator('#crew h3')).toHaveText(['Chenglu', 'Eunseo', 'Yinqi', 'Pip']);
  const pip = page
    .locator('#crew li')
    .filter({ has: page.getByRole('heading', { name: 'Pip', exact: true }) });
  await expect(pip.getByText('AI tutor', { exact: true })).toBeVisible();
  for (let id = 1; id <= 9; id++) {
    const marker = page.locator('sup a[data-week-one-source="' + id + '"]').first();
    await marker.click();
    const dialog = page.getByRole('dialog', { name: 'Source [' + id + ']', exact: false });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link').first()).toHaveAttribute('href', /^https:/);
    if (id % 2) await page.keyboard.press('Escape');
    else await dialog.getByRole('button', { name: 'Back to activity' }).click();
    await expect(marker).toBeFocused();
  }
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('a citation in the game transcript opens above it and returns to the same line', async ({ page }) => {
  await page.goto('/archive/week-one?view=text');
  await page.getByRole('button', { name: 'Use demo learner' }).click();
  await page.getByRole('button', { name: 'Transcript', exact: true }).click();
  const transcript = page.getByRole('dialog', { name: 'Transcript', exact: true });
  const source = transcript.getByRole('link', { name: 'Source 1, Crash Course video' });
  await source.click();
  const dialog = page.getByRole('dialog', { name: /Source \[1\]/ });
  await expect(dialog.getByRole('link', { name: /transcript.*PBS/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(transcript).toBeVisible();
  await expect(source).toBeFocused();
});

test('without scripts each handout citation still opens its numbered reference', async ({
  browser,
  baseURL,
}) => {
  const page = await browser.newPage({ javaScriptEnabled: false, baseURL });
  await page.goto('/activities/w01.html');
  await page.getByRole('link', { name: 'Source 6, SNAIL' }).first().click();
  await expect(page).toHaveURL(/#ref-6$/);
  await expect(page.locator('#ref-6')).toContainText('Laupichler');
  await page.close();
});
