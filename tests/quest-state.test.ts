import assert from 'node:assert/strict';
import test from 'node:test';
import { advance, canAdvance, emptyProgress, stageProgress, updateEntry } from '../src/game/quest-state.ts';

const steps = [
  { id: 'open', stage: 'I Do', type: 'choice', options: [{}, {}] },
  { id: 'guided', stage: 'We Do', type: 'tutor' },
  { id: 'standalone', stage: 'You Do', type: 'write', independent: true },
];

test('stages advance in order after an eligible response', () => {
  const initial = emptyProgress();
  assert.equal(advance(steps, initial), initial);
  const chose = updateEntry(initial, 'open', { selected: 0 });
  const guided = advance(steps, chose);
  assert.equal(guided.index, 1);
  assert.deepEqual(stageProgress(steps, guided), [100, 0, 0]);
  assert.equal(advance(steps, guided), guided);
  const attempted = updateEntry(guided, 'guided', { first: 'I tried this step.' });
  assert.equal(advance(steps, attempted).index, 2);
});

test('fixed comparison gates, independent attempts, and bottle completion', () => {
  const comparison = { type: 'choice', options: [{ best: false }, { best: true }] };
  assert.equal(canAdvance(comparison, { selected: 0 }), false);
  assert.equal(canAdvance(comparison, { selected: 1 }), true);
  const attempt = { type: 'write', independent: true };
  assert.equal(canAdvance(attempt, { revision: 'A revision only.' }), false);
  assert.equal(canAdvance(attempt, { first: 'First try.' }), true);
  assert.equal(canAdvance({ type: 'bottle' }, { sent: true }), false);
  assert.equal(
    canAdvance({ type: 'bottle' }, { sent: true, responded: true, reflection: 'A reflection.' }),
    true,
  );
  assert.equal(canAdvance({ type: 'read', feedback: 'Output' }, {}), false);
  assert.equal(canAdvance({ type: 'read', feedback: 'Output' }, { revealed: true }), true);
});

test('the new Week 1 opening requires both inspections and a choice', () => {
  const opening = { type: 'choice', interaction: 'inspect-record' as const, options: [{}] };
  assert.equal(canAdvance(opening, { selected: 0 }), false);
  assert.equal(canAdvance(opening, { selected: 0, inspected: ['practice', 'fresh'] }), true);
});

test('guided judgments need a supporting line and replays need a prediction and completed test', () => {
  const judgment = { type: 'choice', interaction: 'cite-evidence' as const, options: [{ best: true }, {}] };
  assert.equal(canAdvance(judgment, { selected: 0, evidence: 'draft' }), false);
  assert.equal(canAdvance(judgment, { selected: 1, evidence: 'organizer' }), false);
  assert.equal(canAdvance(judgment, { selected: 0, evidence: 'organizer' }), true);
  const replay = { type: 'choice', interaction: 'controlled-replay' as const, options: [{}, { best: true }] };
  assert.equal(canAdvance(replay, { selected: 1, rule: 'attempt-first', replay: true }), false);
  assert.equal(
    canAdvance(replay, { selected: 1, rule: 'answer', prediction: 'A question', replay: true }),
    false,
  );
  assert.equal(
    canAdvance(replay, { selected: 1, rule: 'attempt-first', prediction: 'A question', replay: true }),
    true,
  );
});

test('You Do first filing and transfer comparison each require their own evidence', () => {
  const transfer = { type: 'write', independent: true, interaction: 'file-recommendation' as const };
  assert.equal(canAdvance(transfer, { first: 'Eunseo started it.' }), false);
  assert.equal(canAdvance(transfer, { first: 'Eunseo started it.', rule: 'answer' }), true);
  const comparison = { type: 'lab', interaction: 'compare-transfer' as const };
  assert.equal(canAdvance(comparison), false);
  assert.equal(canAdvance(comparison, { replay: true }), false);
  assert.equal(canAdvance(comparison, { replay: true, text: 'The first reply confirmed a result.' }), true);
});
