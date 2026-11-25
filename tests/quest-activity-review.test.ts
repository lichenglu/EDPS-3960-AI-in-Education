import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeekOneActivity } from '../src/features/quests/week-one/WeekOneActivity';
import { quests } from '../src/curriculum';
import type { WeekOneEntry } from '../src/contracts/week-one';

function activity(stepId: string, entry: WeekOneEntry, review = true) {
  const step = quests.w01.steps.find((step) => step.id === stepId)!;
  return renderToStaticMarkup(
    createElement(WeekOneActivity, {
      step,
      entry,
      disabled: true,
      review,
      send() {},
      access: { role: 'learner', label: 'Learner', accountKey: 'test', token: 'test' },
      record: {
        questId: 'w01',
        contentVersion: '3',
        revision: 15,
        lastSaved: null,
        unlocked: { feedback: 'Worked feedback.', replay: 'A saved replay.' },
        state: { index: 13, entries: { [stepId]: entry } },
      },
    }),
  );
}

test('review shows the submitted text in a focusable read-only field and disables its save button', () => {
  const review = activity('previous-work', { text: 'My saved comparison.' });
  expect(review).toMatch(/<textarea\b[^>]*readOnly[^>]*>My saved comparison\.<\/textarea>/i);
  expect(review).not.toMatch(/<textarea[^>]*\bdisabled/i);
  expect(review).toMatch(/<button[^>]*\bdisabled/);
  const saving = activity('previous-work', { text: 'My saved comparison.' }, false);
  expect(saving).toMatch(/<textarea[^>]*\bdisabled/i);
  expect(saving).not.toMatch(/<textarea[^>]*readonly/i);
});

test('review opens already-filed independent feedback and keeps a revision distinct from the first response', () => {
  const markup = activity('recommendation', {
    first: 'My first observation.',
    revision: 'A later revision.',
    rule: 'attempt-first',
  });
  expect(markup).toContain('My first observation.');
  expect(markup).toMatch(/<details open=""><summary>Read feedback/);
  expect(markup).toMatch(/<textarea[^>]*readonly[^>]*>A later revision\.<\/textarea>/i);
  const originalOnly = activity('recommendation', { first: 'Only the first.', rule: 'answer' });
  expect(originalOnly).not.toMatch(/<textarea[^>]*>Only the first\.<\/textarea>/);
});

test('the review and live workbenches keep separate rule radio groups', () => {
  const step = quests.w01.steps.find((step) => step.id === 'change-rule')!;
  const render = (rule: 'answer' | 'attempt-first', review: boolean) =>
    createElement(WeekOneActivity, {
      key: rule,
      step,
      review,
      entry: { rule },
      disabled: review,
      send() {},
      access: { role: 'learner' as const, label: 'Learner', accountKey: 'test', token: 'test' },
      record: {
        questId: 'w01' as const,
        contentVersion: '3',
        revision: 5,
        lastSaved: null,
        state: { index: 7, entries: {} },
      },
    });
  const markup = renderToStaticMarkup(
    createElement('main', {}, render('answer', true), render('attempt-first', false)),
  );
  const names = [...markup.matchAll(/<input[^>]*name="([^"]+)"/g)].map((match) => match[1]);
  expect(names.length).toBe(4);
  expect(new Set(names).size).toBe(2);
});
