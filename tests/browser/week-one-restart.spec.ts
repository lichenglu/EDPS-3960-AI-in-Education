import { expect, test } from '@playwright/test';
import { openingDialogue } from '../../src/curriculum/week-one';
import { createLearner } from './learner';
import { startInvestigation } from './start-investigation';

test('Start over opens a fresh demo and can return to the original checkpoint', async ({ page, request }) => {
  const learner = await createLearner(request);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/archive/week-one?view=text');
  await page.getByLabel('Access code').fill(learner.code);
  const button = (name: string) => page.getByRole('button', { name, exact: true });
  const dialogue = page.getByRole('region', { name: 'Scene dialogue' });
  await button('Connect').click();
  await startInvestigation(page);
  await button('Inspect practice record').click();
  await expect(button('Inspect fresh attempt')).toBeEnabled();

  const startOver = button('Start over');
  await expect(startOver).toBeVisible();
  await expect(startOver).toHaveCSS('text-decoration-line', 'underline');
  await startOver.click();
  await expect(page.getByText('Demo run', { exact: true })).toBeVisible();
  await expect(dialogue).toContainText(openingDialogue[0].text);
  await expect(button('Previous line')).toBeDisabled();
  await expect(button('Inspect fresh attempt')).toHaveCount(0);

  await startInvestigation(page);
  await expect(button('Inspect practice record')).toBeEnabled();
  await button('Inspect practice record').click();
  await expect(button('Inspect fresh attempt')).toBeEnabled();
  await page.reload();
  await expect(page.getByText('Demo run', { exact: true })).toBeVisible();
  await expect(button('Inspect fresh attempt')).toBeEnabled();
  await button('Start over').click();
  await expect(page.getByRole('heading', { name: 'Welcome to the evening shift' })).toBeVisible();
  await expect(dialogue).toContainText(openingDialogue[0].text);

  await button('Return to saved run').click();
  await expect(page.getByText('Demo run', { exact: true })).toHaveCount(0);
  await expect(button('Inspect fresh attempt')).toBeEnabled();
});
