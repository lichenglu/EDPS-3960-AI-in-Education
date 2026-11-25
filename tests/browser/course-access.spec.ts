import { expect, test, type Page } from '@playwright/test';
import { createLearner } from './learner';

function requireCourseAccess(page: Page) {
  return page.route('**/api/v1/studio/w01/config', (route) =>
    route.fulfill({ json: { requireAccount: true, localPreview: false } }),
  );
}

test('Weeks 1, 2, and 5 share a course entrance that reflows at 320px', async ({ page }, info) => {
  await requireCourseAccess(page);
  const masthead = page.getByRole('banner');
  const login = page.locator('.quest-access .login');
  const code = login.getByLabel('Access code');
  const connect = login.getByRole('button', { name: 'Connect', exact: true });

  async function readEntrance(week: number) {
    const id = 'w0' + week;
    await page.goto('/quests/' + id);
    await expect(masthead.locator('.studio-week-ribbon')).toHaveText(`Week ${week}`);
    await expect(login.getByRole('heading', { name: 'Enter the learning center' })).toBeVisible();
    await expect(
      login.getByText('Use the same course access code for every week.', { exact: false }),
    ).toBeVisible();
    await expect(code).toHaveAttribute('type', 'password');
    await expect(connect).toBeVisible();
    const printLink = masthead.getByRole('link', { name: /^Printable version/ });
    if (week === 2) {
      await expect(printLink).toHaveCount(0);
      await expect(masthead.getByRole('checkbox', { name: 'Instructor Mode' })).toHaveCount(0);
    } else {
      await expect(printLink).toHaveAttribute('href', `/quests/${id}/print`);
    }
    await page.evaluate(() => document.fonts.ready);
    return login.evaluate((layout) => {
      const panel = getComputedStyle(layout);
      const field = getComputedStyle(layout.querySelector('input[type="password"]')!);
      const submit = getComputedStyle(layout.querySelector('button[type="submit"]')!);
      return {
        panel: [panel.fontFamily, panel.backgroundColor, panel.borderColor, panel.borderRadius],
        field: [
          field.fontFamily,
          field.backgroundColor,
          field.borderColor,
          field.borderRadius,
          field.minHeight,
        ],
        submit: [submit.fontFamily, submit.backgroundColor, submit.borderRadius, submit.minHeight],
      };
    });
  }

  await page.setViewportSize({ width: 1360, height: 900 });
  const weekOne = await readEntrance(1);
  expect(await readEntrance(2)).toEqual(weekOne);
  if (info.project.name === 'chromium') {
    await page.screenshot({ path: info.outputPath('week-2-access-desktop.png'), animations: 'disabled' });
  }
  expect(await readEntrance(5)).toEqual(weekOne);

  await page.setViewportSize({ width: 320, height: 650 });
  await readEntrance(2);
  if (info.project.name === 'chromium') {
    await page.screenshot({ path: info.outputPath('week-2-access-mobile.png'), animations: 'disabled' });
  }
  await code.focus();
  await expect(code).toBeFocused();
  const fullKeyboard = info.project.name === 'webkit' ? 'Alt+' : '';
  await page.keyboard.press(`${fullKeyboard}Tab`);
  await expect(connect).toBeFocused();
  await page.keyboard.press(`${fullKeyboard}Shift+Tab`);
  await expect(code).toBeFocused();
  expect(await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  for (const control of [code, connect]) {
    const box = await control.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box && box.x + box.width).toBeLessThanOrEqual(320);
  }

  await page.goto('/quests/w02?lang=es');
  await expect(masthead.locator('.studio-week-ribbon')).toHaveText('Semana 2');
  await expect(login.getByLabel('Código de acceso')).toBeVisible();
});

test('one learner code signs in on any week and the browser restores that course session', async ({
  page,
  request,
  browser,
  baseURL,
}) => {
  const learner = await createLearner(request);
  await requireCourseAccess(page);
  let signIns = 0;
  page.on('request', (sent) => {
    if (sent.method() === 'POST' && new URL(sent.url()).pathname === '/api/v1/session') signIns++;
  });

  await page.goto('/quests/w01');
  const code = page.getByLabel('Access code');
  await code.fill(learner.code);
  await code.press('Enter');
  await expect(page.getByRole('heading', { name: 'The Five Big Ideas in AI' })).toBeVisible();
  expect(signIns).toBe(1);

  await page.goto('/quests/w02');
  await expect(page.getByRole('button', { name: 'Open the archive' })).toBeVisible();
  await expect(code).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Instructor Mode' })).toHaveCount(0);
  await page.goto('/quests/w05');
  await expect(page.getByRole('heading', { name: 'Why ask for a first attempt?' })).toBeVisible();
  await expect(code).toHaveCount(0);
  expect(signIns).toBe(1);

  const fresh = await browser.newPage({ baseURL });
  try {
    await requireCourseAccess(fresh);
    await fresh.goto('/quests/w02');
    const code = fresh.getByLabel('Access code');
    await expect(code).toBeVisible();
    await code.fill(learner.code);
    await fresh.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(fresh.getByRole('button', { name: 'Open the archive' })).toBeVisible();
    await expect(code).toHaveCount(0);
  } finally {
    await fresh.close();
  }
});
