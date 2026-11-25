import { expect, test } from '@playwright/test';
import { createLearner } from './learner';
import { completeStudioOpening } from './studio-opening';

const studioPath = '/quests/w01';

test('opens the latest Week 1 directly from the course weeks and loads its classroom', async ({ page }) => {
  await page.goto('/');
  const weeks = page.getByRole('navigation', { name: 'Course weeks' });
  await expect(weeks.getByRole('link', { name: /^Week \d+ ·/ })).toHaveCount(15);
  await weeks.getByRole('link', { name: 'Week 1 · AI literacy' }).click();
  await expect(page).toHaveURL(studioPath);
  await expect(page).toHaveTitle('AI in Education · Week 1');
  await expect(page.getByRole('link', { name: 'AI in Education', exact: true })).toHaveAttribute('href', '/');
  await expect(page.getByRole('banner').getByText('Week 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Five Big Ideas in AI' })).toBeVisible();
  const wheel = page.getByRole('img', { name: /AI4K12 wheel/ });
  await expect
    .poll(() => wheel.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);

  const model = page.waitForResponse((response) => response.url().endsWith('/studio/models/classroom.glb'));
  await completeStudioOpening(page);
  expect((await model).ok()).toBe(true);
  await page.getByRole('button', { name: 'Next · Look around' }).click();
  await page.getByRole('button', { name: 'Next · Open a desk' }).click();
  await page.getByRole('button', { name: 'Start at the Sound desk' }).click();
  await page.getByRole('button', { name: 'Confirm and start' }).click();
  await expect(page.getByRole('heading', { name: 'I Do · How speech becomes text' })).toBeVisible();
  await page.getByText('Read the key points instead', { exact: true }).click();
  await expect(page.getByText(/A microphone captures sound/)).toBeVisible();
  await page.getByRole('button', { name: 'Start guided practice' }).click();
  await expect(page.getByRole('button', { name: 'Transcribe', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'All weeks' }).click();
  await expect(weeks).toBeVisible();
  await weeks.getByRole('link', { name: 'Week 3 · Learner models and adaptivity' }).click();
  await expect(page).toHaveURL('/quests/w03');
});

test('the Week 1 panels fill the space between the header and footer', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1050 });
  await page.goto(studioPath);
  const ideasTitle = page.getByRole('heading', { name: 'The Five Big Ideas in AI' });
  async function expectTitleAligned() {
    const title = await page.locator('.masthead > .brand').boundingBox();
    const controls = await page.locator('.studio-toolbar-main').boundingBox();
    if (!title || !controls) throw new Error('Missing studio header');
    expect(Math.abs(title.x - controls.x)).toBeLessThan(1);
  }
  const wheel = page.locator('.ideas-wheel');
  await expect(ideasTitle).toBeVisible();
  await expectTitleAligned();
  await page.evaluate(() => document.fonts.ready);
  const desktopFigure = (await wheel.boundingBox())!;
  expect(desktopFigure.x + desktopFigure.width).toBeLessThan((await ideasTitle.boundingBox())!.x);
  const panel = page.locator('main > .paper');
  const footer = page.getByRole('contentinfo');
  const alignment = await page.locator('.studio-toolbar').evaluate((toolbar) => {
    const ribbon = toolbar.querySelector('.studio-week-ribbon')!;
    const pieces = [ribbon.querySelector('span')!, ...ribbon.querySelectorAll('[aria-hidden]')].map((piece) =>
      piece.getBoundingClientRect(),
    );
    const ribbonCenter =
      (Math.min(...pieces.map((piece) => piece.top)) + Math.max(...pieces.map((piece) => piece.bottom))) / 2;
    const frame = toolbar.getBoundingClientRect();
    const buttons = [...toolbar.querySelectorAll('nav button')].map((button) =>
      button.getBoundingClientRect(),
    );
    return buttons.map((button) => ({
      offset: Math.abs(ribbonCenter - (button.top + button.bottom) / 2),
      clearance: Math.min(button.top - frame.top, frame.bottom - button.bottom),
    }));
  });
  for (const button of alignment) {
    expect(button.offset).toBeLessThan(1.5);
    expect(button.clearance).toBeGreaterThanOrEqual(10);
  }

  async function expectPanelToFill() {
    const box = (await panel.boundingBox())!;
    const header = (await page.getByRole('banner').boundingBox())!;
    const bottom = (await footer.boundingBox())!;
    expect(Math.abs(box.y - header.y - header.height)).toBeLessThan(1);
    expect(Math.abs(bottom.y - box.y - box.height)).toBeLessThan(1);
    expect(Math.abs(1050 - bottom.y - bottom.height - header.y)).toBeLessThan(1);
  }

  await expectPanelToFill();
  await page.getByRole('button', { name: 'Mission hub' }).click();
  await expect(page.getByRole('heading', { name: 'Mission hub' })).toBeVisible();
  await expectPanelToFill();
  await expect(page.getByRole('button', { name: 'How to play' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  await expect(ideasTitle).toBeVisible();
  await expectPanelToFill();
  await completeStudioOpening(page);
  await expect(page.getByRole('heading', { name: 'Take a step' })).toBeVisible();
  await expectPanelToFill();

  await page.setViewportSize({ width: 320, height: 540 });
  await page.goto(studioPath);
  // Replay the opening to test its stacked layout from a returning browser.
  await page.getByRole('button', { name: 'How to play' }).click();
  await page.getByRole('button', { name: 'Replay opening' }).click();
  await expectTitleAligned();
  const mobileTitle = (await ideasTitle.boundingBox())!;
  expect((await wheel.boundingBox())!.y).toBeGreaterThan(mobileTitle.y + mobileTitle.height);
  const begin = page.getByRole('button', { name: 'Begin the story' });
  await begin.scrollIntoViewIfNeeded();
  await expect(begin).toBeInViewport();
  expect(await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
});

test('the studio loads inside an allowed cross-origin frame and enables its opt-in video', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 820 });
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<p>Captioned player fixture</p>',
    }),
  );
  await page.goto('http://127.0.0.1:4199/studio');
  const studio = page.frameLocator('iframe[title="Course"]');
  const handout = studio.getByRole('link', { name: 'Printable version' });
  await expect(handout).toHaveAttribute('href', '/quests/w01/print');
  await expect(handout).toHaveAttribute('target', '_blank');
  await completeStudioOpening(studio);
  await studio.getByRole('button', { name: 'Next · Look around' }).click();
  await studio.getByRole('button', { name: 'Next · Open a desk' }).click();
  await studio.getByRole('button', { name: 'Start at the Sound desk' }).click();
  await studio.getByRole('button', { name: 'Confirm and start' }).click();
  await expect(studio.getByRole('heading', { name: 'I Do · How speech becomes text' })).toBeVisible();
  await expect(studio.locator('iframe.lesson-video-player')).toHaveCount(0);
  await studio.getByRole('button', { name: 'Load captioned video' }).click();
  const player = studio.frameLocator('iframe.lesson-video-player');
  await expect(player.getByText('Captioned player fixture')).toBeVisible();
  expect(
    await studio.locator('body').evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test('a connected learner can retry an iframe save and resume it outside Canvas', async ({
  page,
  browser,
  request,
}) => {
  const learner = await createLearner(request);
  const config = '**/api/v1/studio/w01/config';
  const connectConfig = { json: { requireAccount: true, localPreview: false } };
  await page.route(config, (route) => route.fulfill(connectConfig));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    });
  });
  const checkpointApi = '**/api/v1/studio/w01';
  let shouldFail = false;
  await page.route(checkpointApi, async (route) => {
    if (shouldFail && route.request().method() === 'PUT') {
      shouldFail = false;
      await route.fulfill({ status: 503, json: { error: 'Synthetic outage' } });
    } else await route.continue();
  });
  await page.goto('http://127.0.0.1:4199/studio');
  const studio = page.frameLocator('iframe[title="Course"]');
  await studio.getByLabel('Access code').fill(learner.code);
  await studio.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(studio.getByRole('heading', { name: 'The Five Big Ideas in AI' })).toBeVisible();
  await expect(studio.getByRole('checkbox', { name: 'Instructor Mode' })).toHaveCount(0);
  await expect(studio.getByRole('link', { name: 'Open Week 1 in a new tab' })).toHaveAttribute(
    'href',
    studioPath,
  );
  await completeStudioOpening(studio);
  await studio.getByRole('button', { name: 'Next · Look around' }).click();
  await studio.getByRole('button', { name: 'Next · Open a desk' }).click();
  await studio.getByRole('button', { name: 'Start at the Sound desk' }).click();
  await studio.getByRole('button', { name: 'Confirm and start' }).click();
  await expect(studio.getByText(/^Saved · /)).toBeVisible();
  shouldFail = true;
  await studio.getByRole('button', { name: 'Start guided practice' }).click();
  await expect(studio.getByText('Progress could not be saved.')).toBeVisible();
  await studio.getByRole('button', { name: 'Retry save' }).click();
  await expect(studio.getByText(/^Saved · /)).toBeVisible();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/studio/w01') &&
        response.request().method() === 'PUT' &&
        response.ok(),
    ),
    studio.getByRole('button', { name: 'Transcribe', exact: true }).click(),
  ]);

  const standalone = await browser.newContext();
  try {
    const tab = await standalone.newPage();
    await tab.route(config, (route) => route.fulfill(connectConfig));
    await tab.goto('http://127.0.0.1:4187' + studioPath);
    await tab.getByLabel('Access code').fill(learner.code);
    await tab.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(tab.getByRole('heading', { name: /We Do/ })).toBeVisible();
    await expect(tab.getByRole('button', { name: 'How to play' })).toBeVisible();
    await expect(tab.getByText(/^Saved · /)).toBeVisible();
    await expect(tab.getByRole('list', { name: 'Draft transcript' })).toBeVisible();

    await tab.goto('http://127.0.0.1:4187/instructor');
    await tab.getByRole('button', { name: 'Use demo instructor' }).click();
    const row = tab.getByRole('row', { name: new RegExp(learner.label) });
    await expect(row.getByText('We Do · in progress')).toBeVisible();
    await tab.getByRole('link', { name: 'Preview Week 1' }).click();
    await expect(tab.getByText(/^Instructor preview ·/)).toBeVisible();
    await tab.getByRole('button', { name: 'Mission hub' }).click();
    await expect(tab.getByRole('button', { name: /^Start mission.*Societal Impact/ })).toBeEnabled();
    await expect(tab.getByText(/^Saved · /)).toHaveCount(0);
    await tab.getByRole('button', { name: 'Reset preview' }).click();
    await tab
      .getByRole('dialog', { name: 'Reset this preview?' })
      .getByRole('button', { name: 'Reset studio' })
      .click();
    await expect(tab.getByRole('heading', { name: 'Your classroom studio' })).toBeVisible();
    await tab.getByRole('link', { name: 'Return to instructor dashboard' }).click();
    await expect(row.getByText('We Do · in progress')).toBeVisible();
  } finally {
    await standalone.close();
  }
});

test('How to play appears after finishing the opening and reopens the controls', async ({ page }) => {
  // Earlier previews could save a room visit before the story was read.
  await page.addInitScript(() => {
    localStorage.setItem('classroom-studio.v1.arrival-v2', JSON.stringify('done'));
  });
  await page.goto(studioPath);
  const howToPlay = page.getByRole('button', { name: 'How to play' });
  const begin = page.getByRole('button', { name: 'Begin the story' });
  await expect(begin).toBeVisible();
  await expect(howToPlay).toHaveCount(0);

  await begin.click();
  await page.getByRole('button', { name: 'Continue story' }).click();
  await expect(page.getByRole('heading', { name: 'Can the recorder hear us?' })).toBeVisible();
  await expect(howToPlay).toHaveCount(0);
  await page.getByRole('button', { name: 'Mission hub' }).click();
  await page.getByRole('button', { name: 'Start mission · Perception' }).click();
  await page.getByRole('button', { name: 'Confirm and start' }).click();
  await expect(howToPlay).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Studio navigation' })
    .getByRole('button', { name: 'Studio', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Can the recorder hear us?' })).toBeVisible();
  await completeStudioOpening(page, 'en', 1);
  await expect(page.getByRole('heading', { name: 'Take a step' })).toBeVisible();
  await expect(howToPlay).toBeVisible();
  await page.getByRole('button', { name: 'Close tutorial' }).click();
  await page.reload();
  await expect(howToPlay).toBeVisible();
  await howToPlay.hover();
  const horizontalPadding = await howToPlay.evaluate((button) =>
    parseFloat(getComputedStyle(button).paddingInlineStart),
  );
  expect(horizontalPadding).toBeGreaterThanOrEqual(12);
  await howToPlay.click();
  await expect(page.getByRole('heading', { name: 'Take a step' })).toBeVisible();
});
