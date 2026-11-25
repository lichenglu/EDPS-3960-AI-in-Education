import { expect, test, type Page } from '@playwright/test';
import { openingDialogue } from '../../src/curriculum/week-one';

import { createLearner } from './learner';
import { startInvestigation } from './start-investigation';

async function enter(page: Page, code: string, text: boolean) {
  await page.goto('/archive/week-one' + (text ? '?view=text' : ''));
  await page.getByLabel('Access code').fill(code);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
}

test('the supply table, notebook, text view and 320px iframe use the same checkpoint', async ({
  page,
  request,
}, testInfo) => {
  const learner = await createLearner(request);
  await enter(page, learner.code, false);
  await startInvestigation(page);
  const room = page.getByRole('region', { name: 'Interactive room' });
  const inspect = room.getByRole('button', { name: 'Inspect practice record' });
  await expect(inspect).toBeVisible();
  await expect(page.getByRole('link', { name: 'Text view', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Quest guidance' })).toContainText('Inspect practice record');
  if (testInfo.project.name === 'chromium') {
    await expect(room.locator('canvas')).toBeVisible();
    await expect(room.locator('.workshop-room__concept')).toHaveCount(0);
  }
  await page.screenshot({ path: testInfo.outputPath('workshop.png') });
  await inspect.click();
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  const notebook = page.getByRole('dialog');
  await expect(notebook).toContainText('First-time visitors: check in at the side door.');
  await notebook.getByRole('button', { name: 'Close' }).click();
  await page.goto('/archive/week-one?view=text');
  await expect(page.getByRole('region', { name: 'Scene', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '3D view', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect fresh attempt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check the organizer’s current notice' })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Scene dialogue' })).toContainText(
    openingDialogue.at(-1)!.text,
  );
  await expect(page.getByRole('button', { name: 'Check the organizer’s current notice' })).toBeEnabled();

  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Embedded storage blocked');
      },
    });
  });
  await page.goto('http://127.0.0.1:4199/embed');
  const frame = page.frameLocator('iframe');
  await frame.getByLabel('Access code').fill(learner.code);
  await frame.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(frame.getByRole('button', { name: 'Check the organizer’s current notice' })).toBeVisible();
  const fits = await frame.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth);
  expect(fits).toBeTruthy();
  await frame.getByRole('button', { name: 'How this works' }).click();
  await expect(frame.getByRole('region', { name: 'Quest guidance' })).toBeVisible();
  await expect(frame.getByRole('dialog', { name: 'How this works' })).toHaveCount(0);
  await expect(frame.getByRole('button', { name: 'Next line' })).toHaveAttribute('data-guide-active', '');
  await frame.getByRole('button', { name: 'Return to quest' }).click();
  await expect(frame.getByRole('button', { name: 'Check the organizer’s current notice' })).toBeVisible();
});

test('the map revisits earlier stops and returns to the saved quest without writing progress', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await page.setViewportSize({ width: 320, height: 760 });
  await enter(page, learner.code, true);
  await startInvestigation(page);

  const button = (name: string) => page.getByRole('button', { name, exact: true });
  const map = page.getByRole('dialog', { name: 'Map', exact: true });
  const review = page.getByRole('region', { name: 'Reviewing a stop', exact: true });
  const dialogue = page.getByRole('region', { name: 'Scene dialogue', exact: true });
  const location = (name: string) => map.getByRole('button', { name, exact: true });
  let reviewing = false;
  const reviewWrites: string[] = [];
  page.on('request', (sent) => {
    if (reviewing && sent.method() === 'POST' && sent.url().endsWith('/api/v1/quests/w01/actions')) {
      reviewWrites.push(sent.url());
    }
  });

  await button('Inspect practice record').click();
  await expect(button('Inspect fresh attempt')).toBeEnabled();
  reviewing = true;
  await button('Map').click();
  await expect(map.getByRole('listitem').filter({ hasText: 'Supply table' })).toContainText('You are here');
  await expect(location('The learning center')).toBeEnabled();
  await expect(map.getByRole('listitem').filter({ hasText: 'Pip’s workbench' })).toContainText(
    'Not yet visited',
  );
  await expect(
    map.locator('button:not(:disabled):not([aria-disabled="true"])').filter({ hasText: 'Pip’s workbench' }),
  ).toHaveCount(0);
  await location('The learning center').click();
  await expect(map).toHaveCount(0);
  await expect(review).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Welcome to the evening shift', exact: true }),
  ).toBeFocused();
  await expect(dialogue).toContainText(openingDialogue.at(-1)!.text);
  await expect(button('Previous line')).toBeEnabled();
  await button('Previous line').click();
  await expect(dialogue).toContainText(openingDialogue.at(-2)!.text);
  await button('Return to quest').click();
  await expect(button('Return to quest')).toHaveCount(0);
  await expect(button('Map')).toBeFocused();
  await expect(button('Inspect fresh attempt')).toBeEnabled();
  await expect(dialogue).toContainText(openingDialogue.at(-1)!.text);
  await expect(page.getByRole('heading', { name: 'The notice and Pip’s draft' })).toBeVisible();
  reviewing = false;

  await button('Inspect fresh attempt').click();
  await button('Check the organizer’s current notice').click();
  await button('Continue').click();
  const comparison = page.getByRole('textbox', { name: 'Your comparison' });
  const draft = 'I would find the current notice and check which direction applies to first-time visitors.';
  await comparison.fill(draft);
  reviewing = true;
  await button('Map').click();
  await location('The learning center').click();
  await button('Return to quest').click();
  await expect(comparison).toHaveValue(draft);
  reviewing = false;
  await button('Save response').click();
  await button('Continue').click();
  await button('Open sample record').click();
  await button('Continue').click();
  await expect(page.getByRole('heading', { name: 'Predict what Pip will say' })).toBeVisible();
  await button('Next line').click();
  await button('Next line').click();
  await expect(dialogue).toContainText('Yinqi changes the rule');

  reviewing = true;
  await button('Map').click();
  await location('The learning center').click();
  await expect(dialogue).toContainText(openingDialogue.at(-2)!.text);
  await button('Map').click();
  await expect(map.getByRole('listitem').filter({ hasText: 'The learning center' })).toContainText(
    'You are here',
  );
  await expect(map.getByRole('listitem').filter({ hasText: 'Pip’s workbench' })).toContainText('Saved place');
  await location('Supply table').click();
  await expect(review.getByText('Supply table', { exact: true })).toBeVisible();
  await expect(review.getByRole('heading', { name: 'Three ways to work with Pip' })).toBeVisible();
  await review.getByRole('combobox', { name: 'Scene', exact: true }).selectOption('opening');
  await expect(review.getByRole('heading', { name: 'Why AI literacy matters' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The notice and Pip’s draft' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A fresh notice · Eunseo’s first try' })).toBeVisible();
  await expect(button('Inspect fresh attempt')).toHaveCount(0);
  await review.getByRole('combobox', { name: 'Scene', exact: true }).selectOption('previous-work');
  const savedComparison = review
    .getByRole('region', { name: 'Station activities' })
    .getByRole('textbox', { name: 'Your comparison' });
  await expect(savedComparison).toHaveValue(draft);
  await expect(savedComparison).toHaveJSProperty('readOnly', true);
  await button('Map').click();
  await map.getByRole('button', { name: /^Pip’s workbench/ }).click();
  await expect(map).toHaveCount(0);
  await expect(button('Return to quest')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Predict what Pip will say' })).toBeVisible();
  await expect(dialogue).toContainText('Yinqi changes the rule');
  expect(reviewWrites).toEqual([]);
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('a learner completes all three stages, retries a lost save, and appears in the instructor roster', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await enter(page, learner.code, true);
  await startInvestigation(page);
  const button = (name: string | RegExp) =>
    page.getByRole('button', { name, exact: typeof name === 'string' });
  const next = async () => {
    await button('Continue').click();
  };
  const checkInstructions = async (...labels: string[]) => {
    const summary = page.getByText('Activity instructions', { exact: true });
    await summary.click();
    for (const label of labels) await expect(page.locator('.activity-instructions')).toContainText(label);
    await summary.click();
  };
  const note = async (text: string, action: string) => {
    await page.getByRole('textbox').first().fill(text);
    await button(action).click();
  };
  await button('Inspect practice record').click();
  await button('Inspect fresh attempt').click();
  await button('Check the organizer’s current notice').click();
  await next();
  await note(
    'Find who signed the current notice, then match the directions with the visitor and volunteer labels.',
    'Save response',
  );
  await next();
  await button('Open sample record').click();
  await next();
  await button(/Pip asks Yinqi to find/).click();
  await next();
  await note(
    'The request was the same. The source-first rule asks Yinqi to read the notice. His rating shows confidence.',
    'Save response',
  );
  await next();
  await button('“Write a welcome sign.”').click();
  await expect(page.getByText(/leaves the location open/)).toBeVisible();
  await button('“Draft one clear sign for first-time visitors using the organizer’s notice.”').click();
  await expect(page.getByText(/compare that location with the notice/)).toBeVisible();
  await next();
  await checkInstructions('Attach one line to your judgment');
  await button(/Pip’s first draft/).click();
  await button(/The sign is clear/).click();
  await button('Ask Yinqi for a hint').click();
  await expect(page.getByText(/Find the instruction addressed to first-time visitors/)).toBeVisible();
  await button(/Organizer’s notice/).click();
  await button(/Pip sent visitors to the volunteers’ entrance/).click();
  await next();
  await checkInstructions('Save prediction', 'Run the same request');
  await page.getByRole('radio', { name: 'Draft the sign' }).click();
  await note('Pip will draft the same sign with the side door.', 'Save prediction');
  await button('Run the same request').click();
  await expect(
    page.getByRole('status').filter({ hasText: 'the scripted test returns the original draft' }),
  ).toBeVisible();
  await expect(button('Continue')).toBeDisabled();
  await page.getByRole('radio', { name: /Ask what the source says/ }).click();
  await note('I think Pip will ask Eunseo where the notice tells visitors to go.', 'Save prediction');
  await button('Run the same request').click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Eunseo reading the notice with a prompt' }),
  ).toBeVisible();
  await next();
  await note(
    'SNAIL and MAILS show how capable he feels. GLAT shows the choice he made on one task. Ask for a new example.',
    'Save response',
  );
  await next();
  await checkInstructions('Send to class', 'Open a bottle');
  await note(
    'Pip tells visitors to use the side door. What line could Eunseo check before drafting?',
    'Send to class',
  );
  await button('Open a bottle').click();
  await note('I would ask Eunseo to find the line written for visitors first.', 'Save reply');
  await note(
    'I would check a notice with a different doorway and let him read it before a hint.',
    'Save private reflection',
  );
  await next();

  await checkInstructions('File first attempt');
  const first =
    'Ask Pip to check the attendee sign against the organizer’s notice. The notice requests an email from attendees, so the badge is wrong. The rating shows confidence and GLAT shows one scored choice. Keep the same request and notice and check whether the new rule asks for the attendee line first.';
  await expect(page.getByText('Filed first attempt', { exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: /Ask what the source says/ }).click();
  await page.getByRole('textbox').fill(first);
  await page.reload();
  await expect(page.getByRole('textbox')).toHaveValue(first);
  await page.getByRole('radio', { name: /Ask what the source says/ }).click();
  let lost = false;
  await page.route('**/api/v1/quests/w01/actions', async (route) => {
    if (!lost && route.request().postDataJSON().intent.type === 'fileFirstAttempt') {
      lost = true;
      await route.fetch();
      await route.abort('connectionreset');
    } else await route.continue();
  });
  await button('File first attempt').click();
  await expect(button('Retry save')).toBeVisible();
  await expect(page.getByText('Filed first attempt', { exact: true })).toHaveCount(0);
  const replacement = await request.post('/api/v1/instructor/learners/' + learner.id + '/reissue', {
    headers: { Authorization: 'Bearer ' + learner.instructor },
  });
  expect(replacement.ok()).toBeTruthy();
  const { code: newCode } = await replacement.json();
  await button('Retry save').click();
  await expect(page.getByRole('heading', { name: 'Reconnect your notebook' })).toBeVisible();
  await page.getByLabel('Access code').fill('DEMO-PEER');
  await button('Connect').click();
  await expect(page.getByRole('status').filter({ hasText: 'different learner' })).toBeVisible();
  await page.getByLabel('Access code').fill(newCode);
  await button('Connect').click();
  await expect(page.getByText('Filed first attempt', { exact: true })).toBeVisible();
  await page.getByText('Revise after feedback', { exact: true }).click();
  await note('Test without hints on a new check-in notice.', 'Save revision');
  await next();
  await checkInstructions('Replay my filed rule');
  await page.getByText('Activity instructions', { exact: true }).click();
  await button('Point to the next action').click();
  const guide = page.getByRole('region', { name: 'Quest guidance' });
  await expect(button('Replay my filed rule')).toHaveAttribute('data-guide-active', '');
  await button('Replay my filed rule').click();
  await expect(page.getByText(/Which line tells workshop attendees what to show/)).toBeVisible();
  const comparison = page.getByRole('textbox', { name: 'Compare the original and the replay' });
  await expect(comparison).toHaveAttribute('data-guide-active', '');
  await expect(guide).toContainText('Compare the replies');
  await button('Dismiss guide').click();
  await button('Point to the next action').click();
  await expect(comparison).toHaveAttribute('data-guide-active', '');
  await button('Dismiss guide').click();
  await page.route('**/api/v1/ai-lab/runs', (route) => route.abort());
  await page.getByText('Optional · Try a different case', { exact: true }).click();
  await button('Compare tutor responses').click();
  await expect(
    page.getByText('Visitors can leave coats on the rack by the lobby.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Which line tells visitors where to leave their coats?', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Scripted example', { exact: true })).toHaveCount(2);
  await note(
    'The original assigns the badge to attendees. In the replay, Eunseo points to the line about the email himself.',
    'Save comparison',
  );
  await next();
  await note('Finding the attendee line changed what I would ask Pip to do.', 'Save response');
  await button('Finish quest').click();
  await expect(page.getByRole('heading', { name: 'Week 1 evidence filed' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Week 1 evidence filed' })).toBeVisible();
  await page.goto('/instructor');
  await button('Use demo instructor').click();
  await expect(
    page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: learner.label }) }),
  ).toContainText('Complete');
});

test('a returning learner can read earlier responses while the new case starts at the welcome', async ({
  page,
  request,
}) => {
  const learner = await createLearner(request);
  await page.route('**/api/v1/quests/w01/progress', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), archivedVersions: ['2'] } });
  });
  await page.route('**/api/v1/quests/w01/archive/2', (route) =>
    route.fulfill({
      json: {
        questId: 'w01',
        contentVersion: '2',
        revision: 7,
        lastSaved: '2027-01-13T15:00:00.000Z',
        state: {
          index: 11,
          entries: {
            recommendation: {
              first: 'My original case response.',
              revision: 'My separate revision.',
            },
          },
        },
      },
    }),
  );
  await enter(page, learner.code, true);

  await expect(page.getByRole('region', { name: 'Scene dialogue' })).toContainText(openingDialogue[0].text);
  await page.getByRole('button', { name: 'Read earlier responses in your Notebook' }).click();
  const notebook = page.getByRole('dialog', { name: 'Notebook' });
  await notebook.getByText('Earlier versions of Week 1', { exact: true }).click();
  await notebook.getByRole('button', { name: 'Open version 2' }).click();
  await expect(notebook).toContainText('My original case response.');
  await expect(notebook).toContainText('My separate revision.');
  await notebook.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to the evening shift' })).toBeVisible();
});
