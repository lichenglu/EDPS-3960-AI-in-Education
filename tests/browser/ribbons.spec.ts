import { expect, test, type Locator } from '@playwright/test';
import { createLearner } from './learner';
import { startInvestigation } from './start-investigation';

async function expectCrown(heading: Locator, ribbon: Locator) {
  await expect(heading).toBeVisible();
  await heading.evaluate(() => document.fonts.ready);
  const title = await heading.evaluate((el) => {
    const text = document.createRange();
    text.selectNodeContents(el);
    return text.getBoundingClientRect().toJSON();
  });
  const banner = await foldedEdges(ribbon);
  expect(Math.abs(banner.left - title.left), 'left tip meets the title').toBeLessThan(2);
  expect(Math.abs(banner.right - title.right), 'right tip meets the title').toBeLessThan(2);
  expect(title.top - banner.bottom, 'ribbon above title').toBeGreaterThanOrEqual(-1);
  expect(title.top - banner.bottom).toBeLessThan(32);
}

async function foldedEdges(ribbon: Locator) {
  return ribbon.evaluate((el) => {
    const folds = [...el.querySelectorAll('[aria-hidden]')].map((part) => part.getBoundingClientRect());
    return {
      left: Math.min(...folds.map((fold) => fold.left)),
      right: Math.max(...folds.map((fold) => fold.right)),
      top: Math.min(...folds.map((fold) => fold.top)),
      bottom: Math.max(...folds.map((fold) => fold.bottom)),
    };
  });
}

for (const width of [320, 985, 1280, 1360, 1472]) {
  test(
    'entrance ribbons span their titles and the gameplay ribbon precedes its title at ' + width + ' pixels',
    async ({ page, request }) => {
      await page.setViewportSize({ width, height: 957 });
      await page.goto('/');
      await expect(page).toHaveTitle('AI in Education');
      await expect(page.locator('.course-ribbon')).toHaveText('ED PS 3960');
      await expectCrown(
        page.getByRole('heading', { name: 'AI in Education', exact: true }),
        page.locator('.course-ribbon'),
      );
      await page.goto('/archive/week-one?view=text');
      await expectCrown(
        page.getByRole('heading', { name: 'The first evening', exact: true }),
        page.locator('.course-ribbon'),
      );
      const learner = await createLearner(request);
      await page.getByLabel('Access code').fill(learner.code);
      await page.getByRole('button', { name: 'Connect', exact: true }).click();
      const mast = page.locator('.mission-title');
      const questHeading = mast.getByRole('heading', { name: 'Week 1 · The first evening', exact: true });
      await expect(questHeading).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await startInvestigation(page);
      await page.getByRole('button', { name: 'Inspect practice record', exact: true }).click();
      await expect(page.locator('.save-state time')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const ribbon = await foldedEdges(mast.locator('.course-ribbon'));
      const questTitle = await mast.getByText('The first evening', { exact: true }).boundingBox();
      expect(questTitle).not.toBeNull();
      expect(questTitle!.x - ribbon.right, 'the folded tip clears the chapter title').toBeGreaterThanOrEqual(
        8,
      );
      expect(
        Math.abs(questTitle!.y + questTitle!.height / 2 - (ribbon.top + ribbon.bottom) / 2),
      ).toBeLessThan(2);
      expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

      const hud = page.locator('.game-hud');
      const home = (await hud.getByRole('link', { name: 'AI in Education' }).boundingBox())!;
      const panel = hud.locator('.game-hud-row');
      await expect(hud).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(panel).toHaveCSS('background-color', 'rgb(248, 248, 240)');
      const panelBox = (await panel.boundingBox())!;
      expect(panelBox.y, 'the home link sits above the cream panel').toBeGreaterThanOrEqual(
        home.y + home.height,
      );
      if (width >= 1280) {
        const rowCenter = (ribbon.top + ribbon.bottom) / 2;
        for (const item of await hud.locator('.tools > *, .save-state').all()) {
          const box = (await item.boundingBox())!;
          expect(box.x).toBeGreaterThan(questTitle!.x + questTitle!.width);
          expect(
            Math.abs(box.y + box.height / 2 - rowCenter),
            'tools and save status align with the title',
          ).toBeLessThan(2);
        }
      }

      await page.goto('/instructor');
      const heading = page.getByRole('heading', { name: 'Instructor dashboard', exact: true });
      await expect(heading).toBeVisible();
      const row = (await heading.boundingBox())!;
      const banner = await foldedEdges(heading.locator('.course-ribbon'));
      expect(Math.abs(banner.left - row.x)).toBeLessThan(2);
      expect(Math.abs(banner.right - row.x - row.width)).toBeLessThan(2);
      expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    },
  );
}
