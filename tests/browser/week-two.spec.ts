import { expect, test, type Page } from '@playwright/test';
import { weekTwoLesson } from '../../src/curriculum/week-02/lesson';
import { createLearner } from './learner';

const configRoute = '**/api/v1/studio/w01/config';

function requireAccount(page: Page) {
  return page.route(configRoute, (route) =>
    route.fulfill({ json: { requireAccount: true, localPreview: false } }),
  );
}

async function enterWeekTwo(page: Page, code: string) {
  await requireAccount(page);
  await page.goto('/quests/w02');
  await page.getByLabel('Access code').fill(code);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
}

test('the Week 2 header shares the Week 1 shell and keeps its controls usable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const banner = page.getByRole('banner');
  async function measureHeader(week: number) {
    await page.goto(`/quests/w0${week}`);
    await expect(banner.locator('.studio-week-ribbon')).toHaveText(`Week ${week}`);
    await expect(
      banner.getByRole('heading', { name: week === 1 ? 'AI Literacy' : weekTwoLesson.title }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    return banner.evaluate((header) => {
      function element(selector: string) {
        const match = header.querySelector(selector);
        if (!match) throw new Error(`Missing header element ${selector}`);
        return match;
      }
      function box(element: Element) {
        const { left, top, right, bottom, height } = element.getBoundingClientRect();
        return { left, top, right, bottom, height };
      }
      const brand = element(':scope > .brand');
      const toolbar = element('.studio-toolbar');
      const main = element('.studio-toolbar-main');
      const ribbon = element('.studio-week-ribbon');
      const title = element('.quest-masthead-title');
      const brandStyle = getComputedStyle(brand);
      const toolbarStyle = getComputedStyle(toolbar);
      const ribbonStyle = getComputedStyle(ribbon);
      const ribbonTextStyle = getComputedStyle(ribbon.querySelector('span') ?? ribbon);
      const titleStyle = getComputedStyle(title);
      return {
        brand: box(brand),
        toolbar: box(toolbar),
        main: box(main),
        ribbon: box(ribbon),
        title: box(title),
        styles: {
          brand: [brandStyle.fontFamily, brandStyle.fontSize, brandStyle.fontWeight, brandStyle.color],
          toolbar: [toolbarStyle.backgroundColor, toolbarStyle.borderColor, toolbarStyle.borderRadius],
          ribbon: [ribbonStyle.fontFamily, ribbonStyle.fontSize, ribbonStyle.fontWeight],
          ribbonText: [ribbonTextStyle.backgroundColor, ribbonTextStyle.color],
          title: [titleStyle.fontFamily, titleStyle.fontSize, titleStyle.fontWeight, titleStyle.color],
        },
      };
    });
  }
  const weekOne = await measureHeader(1);
  const weekTwo = await measureHeader(2);
  expect(weekTwo.styles).toEqual(weekOne.styles);
  expect(weekTwo.brand.bottom).toBeLessThanOrEqual(weekTwo.toolbar.top);
  expect(Math.abs(weekTwo.brand.left - weekTwo.main.left)).toBeLessThan(2);
  expect(Math.abs(weekTwo.toolbar.left - weekOne.toolbar.left)).toBeLessThan(2);
  expect(Math.abs(weekTwo.toolbar.right - weekOne.toolbar.right)).toBeLessThan(2);
  expect(Math.abs(weekTwo.toolbar.top - weekOne.toolbar.top)).toBeLessThan(2);
  expect(Math.abs(weekTwo.toolbar.height - weekOne.toolbar.height)).toBeLessThan(2);
  for (const week of [weekOne, weekTwo]) {
    expect(week.title.left).toBeGreaterThan(week.ribbon.right);
    expect(
      Math.abs((week.title.top + week.title.bottom - week.ribbon.top - week.ribbon.bottom) / 2),
    ).toBeLessThan(3);
  }

  const stages = page.getByRole('navigation', { name: 'Lesson stages' });
  async function expectBookmarks() {
    await expect(page.getByRole('link', { name: /^(Text view|Illustrated view)$/ })).toHaveCount(0);
    await expect(page.getByText(/^Local preview ·/)).toHaveCount(0);
    const controls = await banner.locator('.top-controls').evaluate((tools) => {
      const mode = tools.querySelector('label')!.getBoundingClientRect();
      const language = tools.querySelector('.language-select')!.getBoundingClientRect();
      return { gap: language.left - mode.right, sameRow: Math.abs(language.top - mode.top) < 2 };
    });
    expect(controls.sameRow).toBe(true);
    expect(controls.gap).toBeGreaterThanOrEqual(16);
    const tabs = await stages.evaluate((nav) => {
      const activity = nav.nextElementSibling;
      if (!activity?.matches('.w02-activity')) throw new Error('Stage tabs must precede the activity');
      const panel = activity.getBoundingClientRect();
      return [...nav.querySelectorAll('button')].map((button) => {
        const tab = button.getBoundingClientRect();
        return {
          overlap: Math.round((tab.bottom - panel.top) * 100) / 100,
          inside: tab.left >= panel.left && tab.right <= panel.right,
        };
      });
    });
    for (const tab of tabs) {
      expect(tab.overlap).toBeGreaterThanOrEqual(0);
      expect(tab.overlap).toBeLessThanOrEqual(2);
      expect(tab.inside).toBe(true);
    }
  }
  await expect(banner.getByRole('navigation', { name: 'Lesson stages' })).toHaveCount(0);
  expect((await stages.boundingBox())!.y).toBeGreaterThan(weekTwo.toolbar.bottom);
  await expectBookmarks();
  const currentStage = stages.getByRole('button', { name: /^I Do\b/ });
  await expect(currentStage).toBeEnabled();
  await expect(currentStage).toHaveCSS('background-color', 'rgb(245, 184, 61)');
  await expect(stages.getByRole('button', { name: /^We Do\b/ })).toBeDisabled();
  await expect(stages.getByRole('button', { name: /^You Do\b/ })).toBeDisabled();

  await page.setViewportSize({ width: 320, height: 700 });
  const mobileOne = await measureHeader(1);
  const mobileTwo = await measureHeader(2);
  expect(Math.abs(mobileTwo.toolbar.top - mobileOne.toolbar.top)).toBeLessThan(2);
  expect(Math.abs(mobileTwo.ribbon.left - mobileOne.ribbon.left)).toBeLessThan(2);
  for (const week of [mobileOne, mobileTwo]) {
    expect(week.title.left).toBeGreaterThan(week.ribbon.right);
    expect(
      Math.abs((week.title.top + week.title.bottom - week.ribbon.top - week.ribbon.bottom) / 2),
    ).toBeLessThan(3);
  }
  await expect(banner.getByRole('link', { name: 'AI in Education', exact: true })).toBeVisible();
  const tools = banner.locator('.top-controls');
  await expect(tools.getByRole('link', { name: /Printable version|Open in a new tab/i })).toHaveCount(0);
  await expect(tools.getByRole('checkbox', { name: 'Instructor Mode' })).toBeVisible();
  const language = tools.getByRole('button', { name: 'Language' });
  await language.press('Enter');
  await expect(tools.getByRole('group', { name: 'Language' })).toBeVisible();
  await language.press('Escape');
  await expect(language).toBeFocused();
  await expectBookmarks();
  await tools.getByRole('checkbox', { name: 'Instructor Mode' }).check();
  await stages.getByRole('button', { name: /^We Do\b/ }).click();
  await expectBookmarks();
  expect(await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
});

test('localhost opens Week 2 without a code and resumes the timeline in the same browser', async ({
  page,
}) => {
  const learnerRequests: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (
      pathname.startsWith('/api/v1/quests/w02/') ||
      pathname === '/api/progress/w02' ||
      /^\/api\/(?:v1\/)?(?:session$|bottles(?:\/|$))/.test(pathname)
    ) {
      learnerRequests.push(pathname);
    }
  });
  await page.goto('/quests/w02');
  const timeline = page.getByRole('navigation', { name: 'Timeline milestones' });
  await expect(timeline).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByLabel('Access code')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open the archive' }).click();
  await expect(timeline.getByRole('button', { name: '1970 · locked' })).toBeDisabled();
  const first = weekTwoLesson.milestones[0];
  await expect(timeline.getByRole('button', { name: `${first.year} · ${first.title}` })).toHaveCount(0);
  await page.getByRole('radio', { name: first.options[0].label, exact: true }).check();
  await page.getByRole('button', { name: 'Try this move' }).click();
  const reveal = timeline.getByRole('button', { name: `${first.year} · ${first.title}` });
  await expect(reveal).toBeVisible();
  await expect(timeline.getByRole('button', { name: '1970 · open mystery' })).toBeEnabled();

  await page.getByRole('button', { name: /^I Do/ }).click();
  await expect(timeline).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume We Do at 1970' }).click();
  await expect(page.getByRole('heading', { name: '1970', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('video')).toHaveCount(1);
  await expect(timeline).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume We Do at 1970' }).click();
  await expect(page.getByRole('heading', { name: '1970', exact: true })).toBeFocused();
  await expect(reveal).toBeVisible();
  await expect(timeline.getByRole('button', { name: '1970 · open mystery' })).toBeEnabled();
  await expect(page.getByLabel('Access code')).toHaveCount(0);
  expect(learnerRequests).toEqual([]);

  await page.goto('/quests/w02?preview=instructor');
  await expect(page.getByLabel('Access code')).toBeVisible();
});

test('the archive reveals years after an attempt and saves a future proposal', async ({
  page,
  request,
}, info) => {
  const learner = await createLearner(request);
  await enterWeekTwo(page, learner.code);
  await expect(page.getByRole('button', { name: /^Reset (progress|preview)$/ })).toHaveCount(0);
  const start = page.getByRole('button', { name: 'Open the archive' });
  await expect(start).toBeVisible();
  await expect(page.getByText('Teaching machines', { exact: true })).toHaveCount(0);
  const timeline = page.getByRole('navigation', { name: 'Timeline milestones' });
  await expect(timeline).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await start.click();
  await expect(timeline).toContainText('20??');
  await expect(timeline.getByRole('button', { name: '1970 · locked' })).toBeDisabled();
  await expect(page.getByText('Tutors and adaptive practice', { exact: true })).toHaveCount(0);
  for (const [index, milestone] of weekTwoLesson.milestones.entries()) {
    await expect(page.getByRole('button', { name: /^We Do/ })).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('video')).toHaveCount(0);
    await expect(page.getByText(milestone.prompt, { exact: true })).toBeVisible();
    const choice = index === 0 ? milestone.options.find((option) => !option.best)! : milestone.options[0];
    await page.getByRole('radio', { name: choice.label, exact: true }).check();
    await page.getByRole('button', { name: 'Try this move' }).click();
    await expect(page.getByText(choice.feedback, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `${milestone.year} · ${milestone.title}` })).toBeVisible();
    if (index === 0) {
      await page.getByRole('button', { name: 'Show hint' }).click();
      await expect(page.getByText(milestone.hint, { exact: true })).toBeVisible();
    }
    if (milestone.id === '1980') {
      await expect(page.getByText('Tutors and adaptive practice', { exact: true })).toBeVisible();
      await expect(page.getByText('Learners build and teach', { exact: false })).toBeVisible();
      await expect(page.getByRole('button', { name: '2008 · locked' })).toBeDisabled();
      if (info.project.name === 'chromium') {
        await page.screenshot({ path: info.outputPath('archive-1980.png'), animations: 'disabled' });
      }
    }
    if (index === weekTwoLesson.milestones.length - 1) break;
    await page.getByRole('button', { name: 'Continue to the next year' }).click();
  }
  await page.getByRole('button', { name: 'Compare the three replies' }).click();
  await page.reload();
  await expect(timeline).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume the tutor comparison' }).click();
  const replay = weekTwoLesson.replay;
  await expect(page.getByText(replay.cards[0].reply, { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: replay.options[0].label, exact: true }).check();
  await page.getByRole('button', { name: 'Try this move' }).click();
  await expect(page.getByRole('button', { name: 'Open the final stop' })).toBeEnabled();
  for (const milestone of weekTwoLesson.milestones) {
    await expect(page.getByRole('button', { name: `${milestone.year} · ${milestone.title}` })).toBeVisible();
  }
  await page.reload();
  await expect(timeline).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume your proposal' }).click();
  const future = weekTwoLesson.future;
  await page.getByRole('combobox', { name: 'An idea from the timeline' }).selectOption(future.concepts[0].id);
  await page
    .getByRole('combobox', { name: 'A decision a person keeps' })
    .selectOption(future.humanDecisions[0].id);
  await page
    .getByRole('combobox', { name: 'A way to check for learning' })
    .selectOption(future.evidence[0].id);
  const rationale =
    'Ask what operation undoes adding five. Let the teacher set the maximum help. Give 6x + 8 = 32 without a tutor and ask the learner to explain each change.';
  await page.getByRole('textbox', { name: /Explain your tutoring plan/ }).fill(rationale);
  await page.getByRole('button', { name: 'Save my proposal' }).click();
  await expect(page.getByText(rationale, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Case Note 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Optional check', exact: true }).click();
  await page.getByRole('button', { name: 'Skip check' }).click();
  await expect(page.getByText('Week 2 complete', { exact: true })).toBeVisible();
  await page.reload();
  await expect(timeline).toHaveCount(0);
  await page.getByRole('button', { name: 'Review your saved proposal' }).click();
  await expect(page.getByText(rationale, { exact: true })).toBeVisible();
  const checkActions: string[] = [];
  page.on('request', (sent) => {
    if (sent.method() === 'POST' && sent.url().endsWith('/api/v1/quests/w02/actions')) {
      checkActions.push(sent.url());
    }
  });
  await page.getByRole('button', { name: 'Optional check', exact: true }).click();
  const check = weekTwoLesson.quickCheck;
  await page.getByRole('radio', { name: check.options[1].label, exact: true }).check();
  await page.getByRole('button', { name: 'Check my answer' }).click();
  await expect(page.getByText('A better choice is available', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: check.options[0].label, exact: true }).check();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Best choice', { exact: true })).toBeVisible();
  expect(checkActions).toEqual([]);

  const roster = await request.get('/api/v1/instructor/roster', {
    headers: { Authorization: 'Bearer ' + learner.instructor },
  });
  expect(roster.ok()).toBeTruthy();
  const saved = (await roster.json()).learners.find((entry: { id: string }) => entry.id === learner.id);
  expect(saved.progress.w02.stages).toEqual({
    'I Do': 'complete',
    'We Do': 'complete',
    'You Do': 'complete',
  });
  expect(JSON.stringify(saved)).not.toContain(rationale);
});

test('a 320px Canvas-style embed can retry an interrupted save with storage blocked', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await requireAccount(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Embedded storage blocked');
      },
    });
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new Error('Embedded storage blocked');
      },
    });
  });
  await page.goto('http://127.0.0.1:4199/week-two');
  const frame = page.frameLocator('iframe[title="Course"]');
  await frame.getByLabel('Access code').fill(learner.code);
  await frame.getByRole('button', { name: 'Connect', exact: true }).click();
  await frame.getByRole('button', { name: 'Open the archive' }).click();
  const first = weekTwoLesson.milestones[0];
  await frame.getByRole('radio', { name: first.options[0].label, exact: true }).check();
  const action = '**/api/v1/quests/w02/actions';
  await page.route(action, (route) => route.abort());
  await frame.getByRole('button', { name: 'Try this move' }).click();
  await expect(frame.getByText(first.options[0].feedback, { exact: true })).toBeVisible();
  const retry = frame.getByRole('button', { name: 'Retry save' });
  await expect(retry).toBeVisible();
  await expect(frame.getByRole('button', { name: '1970 · locked' })).toBeDisabled();
  await page.unroute(action);
  await retry.click();
  await expect(frame.getByRole('button', { name: 'Continue to the next year' })).toBeEnabled();
  expect(await frame.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
});

test('the instructor can preview the archive without learner progress requests', async ({ page }) => {
  const progressRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/quests/w02/')) progressRequests.push(request.url());
  });
  await page.goto('/instructor');
  await page.getByRole('button', { name: 'Use demo instructor' }).click();
  await page.getByRole('link', { name: 'Preview Week 2' }).click();
  await expect(page.getByText('Instructor preview', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open the archive' }).click();
  const first = weekTwoLesson.milestones[0];
  await page.getByRole('radio', { name: first.options[0].label, exact: true }).check();
  await page.getByRole('button', { name: 'Try this move' }).click();
  await expect(page.getByRole('button', { name: `${first.year} · ${first.title}` })).toBeVisible();
  expect(progressRequests).toEqual([]);
});
