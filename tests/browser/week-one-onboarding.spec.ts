import { expect, test } from '@playwright/test';
import type { WeekOneCheckpoint } from '../../src/contracts/week-one';
import { openingDialogue } from '../../src/curriculum/week-one';
import { createLearner } from './learner';
import { startInvestigation } from './start-investigation';

for (const view of ['3D', 'text']) {
  test(
    'Week 1 teaches the first action in ' + view + ' view, then guides the first decision',
    async ({ page, request }) => {
      await page.setViewportSize({ width: view === 'text' ? 320 : 1280, height: 800 });
      const learner = await createLearner(request);
      await page.goto('/archive/week-one' + (view === 'text' ? '?view=text' : ''));
      await page.getByLabel('Access code').fill(learner.code);
      await page.getByRole('button', { name: 'Connect', exact: true }).click();

      const guide = page.getByRole('region', { name: 'Quest guidance', exact: true });
      const target = page.locator('[data-guide-active]');
      const button = (name: string) => page.getByRole('button', { name, exact: true });
      const nextLine = button('Next line');
      const begin = button('Start the investigation');
      await expect(guide).toBeVisible({ timeout: 12000 });
      await expect(guide).toContainText('Next line');
      await expect(target.and(nextLine)).toBeVisible();
      await expect(nextLine).toHaveText('');
      await expect(nextLine.locator('svg')).toBeVisible();
      await expect(button('Previous line')).toBeDisabled();
      await expect(button('Previous line')).toHaveText('');
      await expect(page.getByRole('dialog', { name: 'How this works' })).toHaveCount(0);
      await expect(nextLine).toBeInViewport();
      await expect(guide).toBeInViewport();
      await expect
        .poll(async () => {
          const hint = await guide.boundingBox();
          const anchor = await nextLine.boundingBox();
          if (!hint || !anchor) return false;
          const horizontalGap = Math.max(0, anchor.x - hint.x - hint.width, hint.x - anchor.x - anchor.width);
          const verticalGap = Math.max(0, anchor.y - hint.y - hint.height, hint.y - anchor.y - anchor.height);
          return (horizontalGap > 0 || verticalGap > 0) && Math.hypot(horizontalGap, verticalGap) <= 48;
        })
        .toBe(true);
      await expect(page.getByRole('button', { name: 'Inspect practice record', exact: true })).toHaveCount(0);
      await nextLine.click();
      await expect(
        page.getByText('Eunseo · Workshop volunteer', { exact: true }).filter({ visible: true }),
      ).toBeVisible();
      await nextLine.click();
      await expect(page.getByRole('region', { name: 'Scene dialogue' })).toContainText('Pip · AI tutor');
      for (let line = 3; line < openingDialogue.length; line++) {
        await nextLine.click();
      }
      await expect(target.and(begin)).toBeVisible();
      await expect(guide).toContainText('Start the investigation');
      await begin.click();
      const inspect = button('Inspect practice record');
      await expect(inspect).toHaveCount(1);
      await expect(inspect).toBeFocused();
      await expect(target.and(inspect)).toBeVisible();
      await expect(guide).toContainText('Inspect practice record');
      await expect(button('Continue')).toBeDisabled();
      await inspect.click();
      await expect(page.getByText('Pip’s first draft', { exact: true })).toBeVisible();
      const fresh = button('Inspect fresh attempt');
      await expect(target.and(fresh)).toBeVisible();
      await expect(guide).toContainText('Inspect fresh attempt');
      await fresh.click();
      await expect(page.getByRole('heading', { name: 'Review the two records' })).toBeFocused();
      await expect(page.getByRole('button', { name: 'Inspect station', exact: true })).toHaveCount(0);

      const choice = button('Check the organizer’s current notice');
      const guidedChoice = target
        .and(choice)
        .or(target.getByRole('button', { name: 'Check the organizer’s current notice' }));
      await expect(guidedChoice).toBeVisible();
      await expect(guide).toContainText('Choose what you would check before posting the sign.');
      await choice.click();
      const next = button('Continue');
      await expect(target.and(next)).toBeVisible();
      await next.click();
      const instructions = page.getByText('Activity instructions', { exact: true });
      await expect(instructions).toBeVisible();
      await instructions.click();
      await expect(page.locator('.activity-instructions')).toContainText('Save response');
      await instructions.click();
      const dialogue = page.getByRole('region', { name: 'Scene dialogue' });
      await expect(dialogue.locator('img')).toHaveAttribute('src', /yinqi\.webp$/);
      if (view === 'text') {
        await dialogue.getByRole('button', { name: 'Go to activity' }).click();
        await expect(page.getByRole('heading', { name: 'Your activity' })).toBeFocused();
      }
      await expect(page.getByRole('button', { name: 'Inspect station', exact: true })).toHaveCount(0);
      await page
        .getByRole('textbox', { name: 'Your comparison' })
        .fill('I would find the current notice and check which direction applies to first-time visitors.');
      await page.getByRole('button', { name: 'Save response' }).click();
      await expect(page.getByText('Compare your response', { exact: true })).toBeVisible();
    },
  );
}

test('refresh resumes the opening dialogue while an interrupted record inspection is recovered', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await page.goto('/archive/week-one?view=text');
  await page.getByLabel('Access code').fill(learner.code);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await startInvestigation(page);

  let requests = 0;
  let releaseReceipt = () => {};
  const receipt = new Promise<void>((resolve) => {
    releaseReceipt = resolve;
  });
  await page.route('**/api/v1/quests/w01/actions', async (route) => {
    const response = await route.fetch();
    if (++requests === 1) {
      await route.abort('connectionreset');
    } else {
      await receipt;
      await route.fulfill({ response });
    }
  });

  try {
    await page.getByRole('button', { name: 'Inspect practice record' }).click();
    await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible();
    await page.reload();
    const dialogue = page.getByRole('region', { name: 'Scene dialogue' });
    await expect(dialogue).toContainText(openingDialogue.at(-1)!.text);
    await expect(dialogue.getByRole('button', { name: 'Previous line' })).toBeEnabled();
    await expect(dialogue.getByRole('button', { name: 'Next line' })).toBeDisabled();
    const fresh = page.getByRole('button', { name: 'Inspect fresh attempt' });
    await expect(fresh).toBeDisabled();
    releaseReceipt();
    await expect(fresh).toBeEnabled();
    await expect(fresh).toHaveAttribute('data-guide-active', '');
    await expect(page.getByRole('region', { name: 'Quest guidance' })).toContainText('Inspect fresh attempt');
  } finally {
    releaseReceipt();
  }
});

test('How this works replays the complete opening and leaves the saved quest intact', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await page.goto('/archive/week-one?view=text');
  await page.getByLabel('Access code').fill(learner.code);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await startInvestigation(page);

  const button = (name: string) => page.getByRole('button', { name, exact: true });
  const dialogue = page.getByRole('region', { name: 'Scene dialogue' });
  const guide = page.getByRole('region', { name: 'Quest guidance', exact: true });
  const walkthrough = page.getByRole('region', { name: 'Walkthrough', exact: true });
  const nextLine = button('Next line');
  const returnToQuest = button('Return to quest');

  await button('Inspect practice record').click();
  await button('Inspect fresh attempt').click();
  await button('Check the organizer’s current notice').click();
  await button('Continue').click();
  const comparison = page.getByRole('textbox', { name: 'Your comparison' });
  await expect(comparison).toBeVisible();

  const savedText = 'I would check who issued the current notice.';
  const draft = 'I would check how the notice distinguishes visitors and volunteers.';
  await comparison.fill(savedText);
  await button('Save response').click();
  await expect(page.getByText('Compare your response', { exact: true })).toBeVisible();
  await comparison.fill(draft);
  await nextLine.click();
  await expect(dialogue).toContainText('The center’s group chat has a screenshot');
  const signIn = await request.post('/api/v1/session', { data: { code: learner.code } });
  expect(signIn.ok()).toBeTruthy();
  const { token } = await signIn.json();
  const checkpoint = async (): Promise<WeekOneCheckpoint> => {
    const answer = await request.get('/api/v1/quests/w01/progress', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(answer.ok()).toBeTruthy();
    return answer.json();
  };
  const before = await checkpoint();
  expect(before.state.entries['previous-work']?.text).toBe(savedText);
  let savedActions = 0;
  page.on('request', (sent) => {
    if (sent.method() === 'POST' && sent.url().endsWith('/api/v1/quests/w01/actions')) savedActions++;
  });

  await button('How this works').click();
  await expect(walkthrough).toBeVisible();
  await expect(returnToQuest).toBeVisible();
  await expect(dialogue).toContainText(openingDialogue[0].text);
  await expect(dialogue.getByRole('button', { name: 'Previous line' })).toBeDisabled();
  await expect(nextLine).toHaveAttribute('data-guide-active', '');
  await nextLine.click();
  await expect(dialogue).toContainText(openingDialogue[1].text);
  await startInvestigation(page, 2);
  await expect(button('Inspect practice record')).toHaveAttribute('data-guide-active', '');
  await button('Inspect practice record').click();
  await expect(walkthrough.getByText('Pip’s first draft', { exact: true })).toBeVisible();
  await expect(button('Inspect fresh attempt')).toHaveAttribute('data-guide-active', '');
  await button('Inspect fresh attempt').click();
  await expect(page.getByRole('heading', { name: 'Review the two records' })).toBeVisible();
  await button('Check whether the sign reads clearly').click();
  await expect(button('Continue')).toHaveAttribute('data-guide-active', '');
  await button('Continue').click();
  await expect(returnToQuest).toHaveCount(0);
  await expect(comparison).toHaveValue(draft);
  await expect(dialogue).toContainText('The center’s group chat has a screenshot');
  expect(await checkpoint()).toEqual(before);

  await button('How this works').click();
  await expect(dialogue).toContainText(openingDialogue[0].text);
  await nextLine.click();
  await expect(dialogue).toContainText(openingDialogue[1].text);
  await button('How this works').click();
  await expect(dialogue).toContainText(openingDialogue[0].text);
  await expect(guide).toBeVisible();
  await guide.getByRole('button', { name: 'Dismiss guide' }).focus();
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await returnToQuest.click();
  await expect(comparison).toHaveValue(draft);
  await expect(dialogue).toContainText('The center’s group chat has a screenshot');
  expect(await checkpoint()).toEqual(before);
  expect(savedActions).toBe(0);
});
