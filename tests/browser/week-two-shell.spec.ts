import { expect, test } from '@playwright/test';
import { weekTwoMilestones } from '../../src/curriculum/week-02/lesson';

test('We Do keeps the stage tabs in place and reveals milestones within one activity', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/quests/w02');

  const stages = page.getByRole('navigation', { name: 'Lesson stages' });
  const weDo = stages.getByRole('button', { name: /^We Do/ });
  const activity = page.locator('.w02-activity');
  const timeline = page.getByRole('navigation', { name: 'Timeline milestones' });
  const first = weekTwoMilestones[0];

  await page.getByRole('button', { name: 'Open the archive' }).click();
  await stages.getByRole('button', { name: /^I Do/ }).click();
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  const initialTabs = (await stages.boundingBox())!;
  const initialActivity = (await activity.boundingBox())!;

  await weDo.click();
  await expect(weDo).toHaveAttribute('aria-current', 'step');
  const tabs = (await stages.boundingBox())!;
  expect(Math.abs(tabs.x - initialTabs.x)).toBeLessThan(1);
  expect(Math.abs(tabs.y - initialTabs.y)).toBeLessThan(1);
  await expect(activity).toHaveCount(1);
  await expect(activity.getByRole('navigation', { name: 'Timeline milestones' })).toBeVisible();
  expect(Math.abs((await activity.boundingBox())!.width - initialActivity.width)).toBeLessThan(1);
  const heading = activity.getByRole('heading', { name: first.year, exact: true });
  await expect(heading).toBeVisible();
  const rail = (await timeline.boundingBox())!;
  expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(rail.y + rail.height);

  const mystery = timeline.getByRole('button', { name: `${first.year} · open mystery` });
  const reveal = timeline.getByRole('button', { name: `${first.year} · ${first.title}` });
  await expect(mystery).toContainText('?');
  await expect(reveal).toHaveCount(0);
  await activity.getByRole('radio', { name: first.options[0].label, exact: true }).check();
  await activity.getByRole('button', { name: 'Try this move' }).click();
  await expect(reveal).toContainText(first.title);
  expect(await timeline.evaluate((nav) => nav.getAnimations({ subtree: true }).length)).toBe(0);
});

test('the Week 2 timeline scrolls on its own at 320px and year buttons work by keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/quests/w02');
  await page.getByRole('checkbox', { name: 'Instructor Mode' }).check();
  await page.getByRole('button', { name: /^We Do/ }).press('Enter');

  const timeline = page.getByRole('navigation', { name: 'Timeline milestones' });
  const latest = weekTwoMilestones.at(-1)!;
  const laterYear = timeline.getByRole('button', { name: `${latest.year} · open mystery` });
  await expect(laterYear).toBeEnabled();
  expect(
    await laterYear.evaluate((year) => {
      for (let parent = year.parentElement; parent; parent = parent.parentElement) {
        if (/^(auto|scroll)$/.test(getComputedStyle(parent).overflowX)) {
          parent.scrollLeft = parent.scrollWidth;
          return parent.scrollLeft > 0;
        }
        if (parent.matches('nav')) break;
      }
      return false;
    }),
  ).toBe(true);
  expect(await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  await laterYear.press('Enter');
  await expect(laterYear).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('heading', { name: latest.year, exact: true })).toBeFocused();
});

test('the Week 2 footer, reset, and local instructor switch work at 320px without changing learner progress', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/quests/w02');
  const footer = page.getByRole('contentinfo');
  const mode = page.getByRole('checkbox', { name: 'Instructor Mode' });
  const stages = page.getByRole('navigation', { name: 'Lesson stages' });
  const timeline = page.getByRole('navigation', { name: 'Timeline milestones' });
  await expect(mode).not.toBeChecked();
  await expect(footer.getByRole('link', { name: 'All weeks' })).toHaveAttribute('href', '/');
  await expect(footer.getByRole('link', { name: /Anderson/ })).toHaveAttribute('href', /^https:/);
  await expect(page.getByRole('link', { name: /Printable version|Open in a new tab/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open the archive' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Try this move' }).click();
  const progressKey = 'next-move.w02.1.local-progress';
  const studentProgress = await page.evaluate((key) => localStorage.getItem(key), progressKey);
  expect(studentProgress).toBeTruthy();

  await mode.check();
  await expect(timeline).toHaveCount(0);
  await stages.getByRole('button', { name: /^We Do/ }).click();
  await timeline.getByRole('button', { name: /^2025/ }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Try this move' }).click();
  const latest = weekTwoMilestones.at(-1)!;
  await expect(timeline.getByRole('button', { name: latest.year + ' · ' + latest.title })).toBeVisible();
  await stages.getByRole('button', { name: /^You Do/ }).click();
  await expect(page.getByRole('textbox', { name: /Explain your tutoring plan/ })).toBeVisible();
  await page.getByRole('textbox', { name: /Explain your tutoring plan/ }).fill('A demonstration draft.');
  await page.getByRole('button', { name: 'Reset preview', exact: true }).click();
  const previewDialog = page.getByRole('dialog', { name: 'Reset this preview?' });
  await previewDialog.getByRole('button', { name: 'Reset preview', exact: true }).click();
  await expect(previewDialog).not.toBeVisible();
  await expect(stages.getByRole('button', { name: /^I Do/ })).toHaveAttribute('aria-current', 'step');
  await stages.getByRole('button', { name: /^We Do/ }).click();
  await expect(timeline.getByRole('button', { name: latest.year + ' · ' + latest.title })).toHaveCount(0);
  await stages.getByRole('button', { name: /^You Do/ }).click();
  await expect(page.getByRole('textbox', { name: /Explain your tutoring plan/ })).toHaveValue('');
  expect(await page.evaluate((key) => localStorage.getItem(key), progressKey)).toBe(studentProgress);
  await mode.uncheck();
  await expect(timeline.getByRole('button', { name: '2025 · locked' })).toBeDisabled();
  await expect(stages.getByRole('button', { name: /^You Do/ })).toBeDisabled();
  await expect(footer).toBeVisible();
  expect(
    await footer.evaluate(
      (el) =>
        el.getBoundingClientRect().top >=
        document.querySelector('.w02-activity')!.getBoundingClientRect().bottom,
    ),
  ).toBe(true);
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

  await page.evaluate(() => {
    sessionStorage.setItem(
      'next-move.w02.local-rationale',
      JSON.stringify({ base: '', text: 'A saved draft.' }),
    );
    localStorage.setItem('next-move.studio.w01.reset-test', 'keep Week 1 work');
  });
  const reset = page.getByRole('button', { name: 'Reset progress', exact: true });
  await reset.click();
  const dialog = page.getByRole('dialog', { name: 'Reset Week 2 progress?' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), progressKey)).toBe(studentProgress);
  await expect(reset).toBeFocused();
  await reset.click();
  await dialog.getByRole('button', { name: 'Reset progress', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(timeline).toHaveCount(0);
  await expect(stages.getByRole('button', { name: /^We Do/ })).toBeDisabled();
  const cleared = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(cleared.state).toEqual({
    introComplete: false,
    completedMilestones: [],
    replayComplete: false,
    futureComplete: false,
  });
  expect(cleared.revision).toBeGreaterThan(JSON.parse(studentProgress!).revision);
  expect(await page.evaluate(() => sessionStorage.getItem('next-move.w02.local-rationale'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('next-move.studio.w01.reset-test'))).toBe(
    'keep Week 1 work',
  );
  await page.reload();
  await expect(stages.getByRole('button', { name: /^We Do/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Open the archive' })).toBeVisible();
});

test('Week 2 can reset progress when browser storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage blocked', 'SecurityError');
    };
    Storage.prototype.removeItem = () => {
      throw new DOMException('Storage blocked', 'SecurityError');
    };
  });
  await page.goto('/quests/w02');
  await page.getByRole('button', { name: 'Open the archive' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Try this move' }).click();
  await page.getByRole('button', { name: 'Reset progress', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset progress', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open the archive' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^We Do/ })).toBeDisabled();
  await expect(page.getByRole('navigation', { name: 'Timeline milestones' })).toHaveCount(0);
});
