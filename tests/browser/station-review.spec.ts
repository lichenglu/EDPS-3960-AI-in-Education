import { expect, test, type Page } from '@playwright/test';
import type { WeekOneAction, WeekOneCheckpoint, WeekOneIntent } from '../../src/contracts/week-one';
import { openingDialogue, practiceEvidence, weekOne } from '../../src/curriculum/week-one';
import { createLearner } from './learner';
import { startInvestigation } from './start-investigation';

async function reviewStop(page: Page, name: string) {
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Map', exact: true })
    .getByRole('button', { name, exact: true })
    .click();
  return page.getByRole('region', { name: 'Reviewing a stop' });
}

for (const textView of [false, true]) {
  test(`the live ${textView ? 'text' : '3D'} supply table and welcome dialogue resume after leaving`, async ({
    page,
    request,
  }) => {
    const learner = await createLearner(request);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/archive/week-one' + (textView ? '?view=text' : ''));
    await page.getByLabel('Access code').fill(learner.code);
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    const sceneName = textView ? 'Scene' : 'Interactive room';
    const welcome = 'Welcome to the evening shift';
    await expect(page.getByRole('heading', { name: welcome })).toBeVisible();
    const originalRoom = (await page.getByRole('region', { name: sceneName, exact: true }).boundingBox())!;
    await startInvestigation(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: weekOne[0].title })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inspect practice record' })).toBeEnabled();

    const saves: string[] = [];
    page.on('request', (sent) => {
      if (sent.method() === 'POST' && sent.url().endsWith('/api/v1/quests/w01/actions'))
        saves.push(sent.url());
    });
    const review = await reviewStop(page, 'The learning center');
    await expect(review.getByRole('heading', { name: welcome })).toBeFocused();
    const room = review.getByRole('region', { name: sceneName, exact: true });
    const reviewRoom = (await room.boundingBox())!;
    expect(reviewRoom.width).toBeCloseTo(originalRoom.width, 0);
    await expect(review.getByRole('region', { name: 'Station activities' })).toHaveCount(0);
    await expect(review.getByRole('button', { name: 'Go to supply table' })).toBeInViewport();

    const dialogue = room.getByRole('region', { name: 'Scene dialogue' });
    const previous = dialogue.getByRole('button', { name: 'Previous line' });
    const next = dialogue.getByRole('button', { name: 'Next line' });
    await expect(dialogue).toContainText(openingDialogue.at(-1)!.text);
    await previous.click();
    await expect(dialogue).toContainText(openingDialogue.at(-2)!.text);
    await expect(dialogue.getByRole('link', { name: /^Source 1,/ })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 680 });
    await next.click();
    await expect(dialogue.getByRole('button', { name: 'Start the investigation' })).toBeVisible();
    await dialogue.getByRole('button', { name: 'Start the investigation' }).press('Enter');
    await expect(review).toHaveCount(0);
    await expect(page.getByText('Supply table', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: weekOne[0].title })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Inspect practice record' })).toBeEnabled();
    expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(saves).toEqual([]);
  });
}

test('visited supply activities replay their original controls and protect the live draft', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/archive/week-one?view=text');
  await page.getByLabel('Access code').fill(learner.code);
  const button = (name: string) => page.getByRole('button', { name, exact: true });
  await button('Connect').click();
  await startInvestigation(page);
  await button('Inspect practice record').click();
  await expect(button('Inspect fresh attempt')).toBeEnabled();
  const review = await reviewStop(page, 'The learning center');
  await review.getByRole('button', { name: 'Go to supply table' }).click();
  await expect(review).toHaveCount(0);
  await expect(button('Inspect fresh attempt')).toBeEnabled();
  await button('Inspect fresh attempt').click();
  const opening = weekOne[0];
  const openingChoice = opening.options![1];
  await button(openingChoice.label).click();
  await button('Continue').click();

  const writtenScene = weekOne.find((step) => step.id === 'previous-work')!;
  const savedText =
    'I would find the signed current notice and check which line applies to first-time visitors.';
  await page.getByRole('textbox', { name: writtenScene.label }).fill(savedText);
  await button('Save response').click();
  await button('Continue').click();
  await button(weekOne.find((step) => step.id === 'three-perspectives')!.action!).click();
  await button('Continue').click();
  await button(weekOne.find((step) => step.id === 'predict-demo')!.options![0].label).click();
  await button('Continue').click();
  const draft = page.getByRole('textbox');
  const draftText = 'The rule changed and the test input stayed the same.';
  await draft.fill(draftText);

  const saves: string[] = [];
  page.on('request', (sent) => {
    if (sent.method() === 'POST' && sent.url().endsWith('/api/v1/quests/w01/actions')) saves.push(sent.url());
  });
  await reviewStop(page, 'The learning center');
  await review.getByRole('button', { name: 'Go to supply table' }).click();
  await review.getByRole('combobox', { name: 'Scene' }).selectOption(opening.id);
  await expect(review.getByRole('heading', { name: opening.title })).toBeFocused();
  await expect(review.getByText('Supply table', { exact: true })).toBeVisible();
  const activities = review.getByRole('region', { name: 'Station activities' });
  await expect(activities.getByRole('heading', { name: 'Check the workshop notices' })).toBeVisible();
  for (const { line } of practiceEvidence) await expect(activities).toContainText(line);
  const chosen = activities.getByRole('button', { name: openingChoice.label });
  await expect(chosen).toHaveAttribute('aria-pressed', 'true');
  await expect(chosen).toBeEnabled();
  const alternative = activities.getByRole('button', { name: opening.options![0].label });
  await expect(alternative).toHaveAttribute('aria-pressed', 'false');
  await expect(alternative).toBeEnabled();
  await expect(activities).toContainText(openingChoice.feedback);

  await activities.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(review.getByRole('heading', { name: writtenScene.title })).toBeFocused();
  await expect(activities).toContainText(writtenScene.prompt!);
  await expect(activities).toContainText(writtenScene.feedback!);
  const response = activities.getByRole('textbox', { name: writtenScene.label });
  await expect(response).toHaveValue(savedText);
  await expect(response).toHaveJSProperty('readOnly', true);
  await expect(activities.getByRole('button', { name: 'Save response' })).toBeDisabled();

  await page.setViewportSize({ width: 320, height: 680 });
  await review.getByRole('button', { name: 'Go to activity' }).click();
  const activityHeading = activities.getByRole('heading', { name: 'Your activity' });
  await expect(activityHeading).toBeFocused();
  await expect(activityHeading).toBeInViewport();
  await review.getByRole('button', { name: 'Return to quest' }).click();
  await expect(draft).toHaveValue(draftText);
  await expect(button('Map')).toBeFocused();

  await reviewStop(page, 'Supply table');
  await review.getByRole('combobox', { name: 'Scene' }).selectOption('three-perspectives');
  const continueReview = activities.getByRole('button', { name: 'Continue', exact: true });
  await continueReview.click();
  const prediction = weekOne.find((step) => step.id === 'predict-demo')!;
  await expect(review.getByRole('heading', { name: prediction.title })).toBeFocused();
  await expect(review.getByText('Pip’s workbench', { exact: true })).toBeVisible();
  await expect(activities.getByRole('button', { name: prediction.options![0].label })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await continueReview.click();
  await expect(review).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: weekOne.find((step) => step.id === 'demo-evidence')!.title }),
  ).toBeVisible();
  await expect(draft).toHaveValue(draftText);
  expect(saves).toEqual([]);
});

test('a Map review resumes its scene and dialogue after leaving and reloading without exposing drafts', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await page.goto('/archive/week-one?view=text');
  await page.getByLabel('Access code').fill(learner.code);
  const button = (name: string) => page.getByRole('button', { name, exact: true });
  await button('Connect').click();
  await startInvestigation(page);
  await button('Inspect practice record').click();
  await button('Inspect fresh attempt').click();
  await button(weekOne[0].options![1].label).click();
  await button('Continue').click();

  const earlier = weekOne.find((step) => step.id === 'previous-work')!;
  const recorded = 'I would use the signed notice to verify the visitors’ direction.';
  const olderDraft = 'An unfinished edit to the earlier response.';
  const write = page.getByRole('textbox', { name: earlier.label });
  await write.fill(recorded);
  await button('Save response').click();
  await expect(page.getByText('Compare your response', { exact: true })).toBeVisible();
  await write.fill(olderDraft);
  await button('Continue').click();
  await button(weekOne.find((step) => step.id === 'three-perspectives')!.action!).click();
  await button('Continue').click();
  await button(weekOne.find((step) => step.id === 'predict-demo')!.options![0].label).click();
  await button('Continue').click();

  const live = weekOne.find((step) => step.id === 'demo-evidence')!;
  const liveDraft = 'My current draft compares who supplies the location.';
  const liveResponse = page.getByRole('textbox', { name: live.label ?? 'Your response' });
  const dialogue = page.getByRole('region', { name: 'Scene dialogue' });
  await liveResponse.fill(liveDraft);
  await button('Next line').click();
  await expect(dialogue).toContainText(live.paragraphs![1]);

  const saves: string[] = [];
  page.on('request', (sent) => {
    if (sent.method() === 'POST' && sent.url().endsWith('/api/v1/quests/w01/actions')) saves.push(sent.url());
  });
  const review = await reviewStop(page, 'Supply table');
  const picker = review.getByRole('combobox', { name: 'Scene' });
  await picker.selectOption(earlier.id);
  const reviewed = review.getByRole('textbox', { name: earlier.label });
  await expect(reviewed).toHaveValue(recorded);
  await expect(reviewed).toHaveJSProperty('readOnly', true);
  await button('Next line').click();
  await expect(dialogue).toContainText(earlier.paragraphs![1]);

  await button('Return to quest').click();
  await expect(liveResponse).toHaveValue(liveDraft);
  await reviewStop(page, 'Supply table');
  await expect(picker).toHaveValue(earlier.id);
  await expect(dialogue).toContainText(earlier.paragraphs![1]);
  await expect(reviewed).toHaveValue(recorded);

  const otherTab = await page.context().newPage();
  try {
    await otherTab.goto('/archive/week-one?view=text');
    await expect(otherTab.getByRole('heading', { name: live.title })).toBeVisible();
    await expect(otherTab.getByRole('region', { name: 'Reviewing a stop' })).toHaveCount(0);
    await expect(otherTab.getByRole('region', { name: 'Scene dialogue' })).toContainText(live.paragraphs![1]);
  } finally {
    await otherTab.close();
  }

  await page.reload();
  await expect(review.getByRole('heading', { name: earlier.title })).toBeVisible();
  await expect(picker).toHaveValue(earlier.id);
  await expect(dialogue).toContainText(earlier.paragraphs![1]);
  await expect(reviewed).toHaveValue(recorded);
  await expect(reviewed).toHaveJSProperty('readOnly', true);
  await button('Return to quest').click();
  await expect(dialogue).toContainText(live.paragraphs![1]);
  await expect(liveResponse).toHaveValue(liveDraft);
  expect(saves).toEqual([]);
});

test('revised choices and evidence save in the original controls while the live checkpoint stays put', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  const session = await request.post('/api/v1/session', { data: { code: learner.code } });
  await expect(session).toBeOK();
  const { token } = await session.json();
  const headers = { Authorization: 'Bearer ' + token };
  const resource = '/api/v1/quests/w01';
  async function checkpoint(): Promise<WeekOneCheckpoint> {
    const response = await request.get(resource + '/progress', { headers });
    await expect(response).toBeOK();
    return response.json();
  }

  let saved = await checkpoint();
  const setup: WeekOneIntent[] = [
    { stepId: 'opening', type: 'inspectEvidence', evidence: 'practice' },
    { stepId: 'opening', type: 'inspectEvidence', evidence: 'fresh' },
    { stepId: 'opening', type: 'selectChoice', selected: 1 },
    { stepId: 'opening', type: 'advance' },
    { stepId: 'previous-work', type: 'writeNote', text: 'I would check the organizer’s current source.' },
    { stepId: 'previous-work', type: 'advance' },
    { stepId: 'three-perspectives', type: 'reveal' },
    { stepId: 'three-perspectives', type: 'advance' },
    { stepId: 'predict-demo', type: 'selectChoice', selected: 0 },
    { stepId: 'predict-demo', type: 'advance' },
    { stepId: 'demo-evidence', type: 'writeNote', text: 'The same notice and request stayed fixed.' },
    { stepId: 'demo-evidence', type: 'advance' },
    { stepId: 'ask-lantern', type: 'selectChoice', selected: 1 },
    { stepId: 'ask-lantern', type: 'advance' },
    { stepId: 'mark-evidence', type: 'attachEvidence', evidence: 'organizer' },
    { stepId: 'mark-evidence', type: 'selectChoice', selected: 0 },
    { stepId: 'mark-evidence', type: 'advance' },
  ];
  for (const intent of setup) {
    const data: WeekOneAction = {
      actionId: crypto.randomUUID(),
      contentVersion: saved.contentVersion,
      expectedRevision: saved.revision,
      intent,
    };
    const response = await request.post(resource + '/actions', { headers, data });
    await expect(response, `Set up ${intent.stepId} ${intent.type}`).toBeOK();
    saved = await response.json();
  }

  await page.goto('/archive/week-one?view=text');
  await page.getByLabel('Access code').fill(learner.code);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  const current = page.getByRole('heading', { name: weekOne[saved.state.index].title });
  await expect(current).toBeVisible();
  const writes: WeekOneIntent[] = [];
  page.on('request', (sent) => {
    if (sent.method() === 'POST' && sent.url().endsWith(resource + '/actions')) {
      writes.push((sent.postDataJSON() as WeekOneAction).intent);
    }
  });

  const review = await reviewStop(page, 'Supply table');
  const picker = review.getByRole('combobox', { name: 'Scene' });
  const activities = review.getByRole('region', { name: 'Station activities' });
  const opening = weekOne[0];
  await picker.selectOption(opening.id);
  await review.getByRole('button', { name: 'Next line' }).click();
  expect(writes).toEqual([]);
  const originalChoice = activities.getByRole('button', { name: opening.options![1].label });
  const revisedChoice = activities.getByRole('button', { name: opening.options![0].label });
  await expect(originalChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(revisedChoice).toBeEnabled();
  await revisedChoice.click();
  await expect(revisedChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(originalChoice).toHaveAttribute('aria-pressed', 'false');
  await expect(activities).toContainText(opening.options![0].feedback);

  await page.reload();
  await expect(picker).toHaveValue(opening.id);
  await expect(revisedChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(activities).toContainText(opening.options![0].feedback);
  await review.getByRole('button', { name: 'Return to quest' }).click();
  await expect(current).toBeVisible();

  await reviewStop(page, 'Supply table');
  const critic = weekOne.find((step) => step.id === 'mark-evidence')!;
  await picker.selectOption(critic.id);
  const originalEvidence = activities.getByRole('button', {
    name: practiceEvidence.find((line) => line.id === 'organizer')!.label,
  });
  const revisedEvidence = activities.getByRole('button', {
    name: practiceEvidence.find((line) => line.id === 'draft')!.label,
  });
  const originalJudgment = activities.getByRole('button', { name: critic.options![0].label });
  const revisedJudgment = activities.getByRole('button', { name: critic.options![1].label });
  await expect(originalEvidence).toHaveAttribute('aria-pressed', 'true');
  await expect(originalJudgment).toHaveAttribute('aria-pressed', 'true');
  await revisedEvidence.click();
  await expect(revisedEvidence).toHaveAttribute('aria-pressed', 'true');
  await expect(originalEvidence).toHaveAttribute('aria-pressed', 'false');
  await expect(originalJudgment).toHaveAttribute('aria-pressed', 'false');
  await revisedJudgment.click();
  await expect(revisedJudgment).toHaveAttribute('aria-pressed', 'true');
  await expect(activities).toContainText(critic.options![1].feedback);
  await activities.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(review).toHaveCount(0);
  await expect(current).toBeVisible();

  expect(writes).toEqual([
    { stepId: opening.id, type: 'selectChoice', selected: 0 },
    { stepId: critic.id, type: 'attachEvidence', evidence: 'draft' },
    { stepId: critic.id, type: 'selectChoice', selected: 1 },
  ]);
  const after = await checkpoint();
  expect(after.state.index).toBe(saved.state.index);
  expect(after.revision).toBe(saved.revision + writes.length);
  expect(after.state.entries[opening.id]?.selected).toBe(0);
  expect(after.state.entries[critic.id]).toMatchObject({ selected: 1, evidence: 'draft' });
});
