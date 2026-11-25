import { expect, test } from '@playwright/test';
import { openingDialogue } from '../../src/curriculum/week-one';
import { createLearner } from './learner';
import { startInvestigation } from './start-investigation';

test('the welcome scene sets the investigation before revealing the first action', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/archive/week-one');
  await page.getByLabel('Access code').fill(learner.code);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();

  const stage = page.getByRole('region', { name: 'Interactive room' });
  const speech = stage.getByRole('region', { name: 'Scene dialogue' });
  await expect(speech).toBeVisible({ timeout: 2500 });
  await expect(speech).toContainText('evening learning center');
  await expect(speech.getByText('Chenglu · Center director', { exact: true })).toBeVisible();
  await expect(speech.locator('img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Inspect practice record' })).toHaveCount(0);
  const artwork = (await stage.locator('.world-art').boundingBox())!;
  const dialogue = (await speech.boundingBox())!;
  expect(dialogue.width / artwork.width).toBeGreaterThan(0.92);
  await expect(speech).toHaveCSS('backdrop-filter', 'blur(14px)');
  expect(dialogue.y).toBeGreaterThan(artwork.y);
  expect(dialogue.y + dialogue.height).toBeLessThanOrEqual(artwork.y + artwork.height);

  await speech.getByRole('button', { name: 'Next line' }).click();
  await expect(speech).toContainText('one of the workshop volunteers');
  await expect(speech.getByText('Eunseo · Workshop volunteer', { exact: true })).toBeVisible();
  await speech.getByRole('button', { name: 'Next line' }).click();
  await expect(speech).toContainText('Pip · AI tutor');
  await expect(speech).toContainText('I’m Pip, the AI tutor Chenglu is testing.');
  await speech.getByRole('button', { name: 'Previous line' }).click();
  await expect(speech.getByText('Eunseo · Workshop volunteer', { exact: true })).toBeVisible();
  await startInvestigation(page, 2);
  await expect(speech.getByText('Yinqi · Peer tutor', { exact: true })).toBeVisible();
  const inspect = speech.getByRole('button', { name: 'Inspect practice record' });
  await expect(inspect).toBeFocused();
  await expect(page.getByRole('heading', { name: 'The notice and Pip’s draft' })).toHaveCount(0);
  await inspect.click();
  await expect(speech.getByRole('status')).toContainText('Compare the organizer’s notice with Pip’s draft.');
  await expect(page.getByRole('heading', { name: 'The notice and Pip’s draft' })).toBeVisible();
  await expect(page.getByText('Volunteers enter through the side door.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A fresh notice · Eunseo’s first try' })).toHaveCount(0);
  await page.reload();
  await expect(speech).toContainText(openingDialogue.at(-1)!.text);
  await expect(speech.getByText('Yinqi · Peer tutor', { exact: true })).toBeVisible();
  await expect(speech.getByRole('button', { name: 'Previous line' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'The notice and Pip’s draft' })).toBeVisible();
  await expect(speech.getByRole('button', { name: 'Inspect fresh attempt' })).toBeVisible();
});

test('the records and workshop stay side by side at equal height as the evidence grows', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await page.setViewportSize({ width: 1280, height: 740 });
  await page.goto('/archive/week-one');
  await page.getByLabel('Access code').fill(learner.code);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await startInvestigation(page);

  const room = page.getByRole('region', { name: 'Interactive room' });
  const panel = page.getByRole('region', { name: 'Station activities' });
  const expectMatchingPanels = async () => {
    const { left, right } = await panel.evaluate((el) => ({
      left: el.previousElementSibling!.getBoundingClientRect().toJSON(),
      right: el.getBoundingClientRect().toJSON(),
    }));
    expect(right.x).toBeGreaterThan(left.x + left.width);
    expect(Math.abs(left.y - right.y)).toBeLessThan(1);
    expect(Math.abs(left.height - right.height)).toBeLessThan(1);
  };
  await expect(panel).toBeVisible();
  await expectMatchingPanels();
  await page.getByRole('button', { name: 'Inspect practice record' }).click();
  await page.getByRole('button', { name: 'Inspect fresh attempt' }).click();
  await expect(panel.getByRole('heading', { name: 'Review the two records' })).toBeFocused();
  await expect(panel.getByRole('heading', { name: 'A fresh notice · Eunseo’s first try' })).toBeVisible();
  await expect(panel.getByText('Visitors: please wait in the courtyard.', { exact: false })).toBeVisible();
  await expectMatchingPanels();
  await page.setViewportSize({ width: 985, height: 700 });
  await expectMatchingPanels();

  await panel.getByRole('button', { name: 'Check the organizer’s current notice' }).click();
  const next = panel.getByRole('button', { name: 'Continue', exact: true });
  await expect(next).toBeEnabled();
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  await expectMatchingPanels();
  await next.click();
  await expect(panel.getByText('Activity instructions', { exact: true })).toBeVisible();
  expect(await panel.evaluate((el) => el.scrollTop)).toBe(0);
  await expectMatchingPanels();

  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect((await panel.boundingBox())!.y).toBeGreaterThanOrEqual(
    (await room.boundingBox())!.y + (await room.boundingBox())!.height,
  );
});
