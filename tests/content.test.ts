import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courseCast } from '../src/curriculum/characters.ts';
import { quests } from '../src/curriculum/index.ts';
import { practiceEvidence, welcomeRequest } from '../src/curriculum/week-one.ts';
import { weekTwoLesson, weekTwoYearIds } from '../src/curriculum/week-02/lesson.ts';
import { weekTwoReferences } from '../src/curriculum/week-02/references.ts';
import type { Quest, Stage, Step } from '../src/curriculum/index.ts';

const stages: Stage[] = ['I Do', 'We Do', 'You Do'];
const stepTypes: Step['type'][] = ['read', 'write', 'choice', 'tutor', 'bottle', 'lab'];
const printable = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function requireQuest(id: string): Quest {
  const quest = quests[id];
  assert.ok(quest, `missing quest ${id}`);
  return quest;
}

function requireStep(steps: Step[], id: string): Step {
  const step = steps.find((entry) => entry.id === id);
  assert.ok(step, `missing step ${id}`);
  return step;
}

test('each instructional week has a stable syllabus entry', () => {
  const ids = Array.from({ length: 15 }, (_, index) => `w${String(index + 1).padStart(2, '0')}`);
  assert.deepEqual(Object.keys(quests), ids);
  for (const [id, quest] of Object.entries(quests)) {
    assert.equal(quest.id, id);
    for (const key of ['title', 'topic', 'assignment'] as const) assert.ok(printable(quest[key]));
    assert.ok(Array.isArray(quest.steps));
    assert.equal(quest.steps.length > 0, ['w01', 'w02', 'w05'].includes(id));
  }
  assert.match(requireQuest('w01').assignment, /Orientation check.*Jan 17/i);
  assert.match(requireQuest('w05').assignment, /Lab 2.*Feb 14/i);
});

for (const id of ['w01', 'w02', 'w05']) {
  test(`${id} has ordered stages, defined choices, and a timed independent response`, () => {
    const quest = requireQuest(id);
    assert.ok(printable(quest.objective));
    assert.ok(quest.version);
    assert.ok(quest.minutes !== null && quest.minutes >= 90 && quest.minutes <= 120);
    assert.equal(
      quest.steps.reduce((sum, step) => sum + step.minutes, 0),
      quest.minutes,
    );
    assert.deepEqual([...new Set(quest.steps.map((step) => step.stage))], stages);
    assert.deepEqual(
      quest.steps.map((step) => stages.indexOf(step.stage)),
      quest.steps.map((step) => stages.indexOf(step.stage)).sort((a, b) => a - b),
    );
    assert.equal(new Set(quest.steps.map((step) => step.id)).size, quest.steps.length);
    for (const step of quest.steps) {
      assert.match(step.id, /^[a-z][a-z0-9-]+$/);
      assert.ok(stepTypes.includes(step.type));
      assert.ok(printable(step.title) && printable(step.help));
      assert.ok(Number.isInteger(step.minutes) && step.minutes >= 0);
      if (step.speaker !== undefined) assert.ok(Object.hasOwn(courseCast, step.speaker.toLowerCase()));
      for (const source of step.sources ?? []) {
        assert.ok(printable(source.label));
        assert.equal(new URL(source.url).protocol, 'https:');
      }
      if (step.type === 'choice') {
        assert.ok(step.options.length >= 1);
        assert.equal(new Set(step.options.map((option) => option.label)).size, step.options.length);
        assert.ok(step.options.every((option) => printable(option.label) && printable(option.feedback)));
        assert.ok(step.options.filter((option) => option.best).length <= 1);
      }
      if (['write', 'choice', 'tutor'].includes(step.type)) assert.ok(printable(step.prompt));
    }
    const independentSteps = quest.steps.filter((step) => step.independent);
    assert.equal(independentSteps.length, 1);
    const [independent] = independentSteps;
    assert.ok(independent?.type === 'write' && independent.independent);
    assert.equal(independent.stage, 'You Do');
    assert.ok(independent.criteria.length >= 3 && independent.feedback === undefined);
    assert.equal(independent.hints, undefined);
    const bottle = quest.steps.find((step) => step.type === 'bottle');
    assert.ok(bottle);
    assert.equal(bottle.stage, 'We Do');
    assert.ok(printable(bottle.feedback));
  });
}

test('Week 1 makes the three literacy perspectives observable without a math prerequisite', () => {
  const { steps, minutes } = requireQuest('w01');
  assert.equal(minutes, 105);
  assert.deepEqual(
    stages.map((stage) =>
      steps.filter((step) => step.stage === stage).reduce((sum, step) => sum + step.minutes, 0),
    ),
    [30, 50, 25],
  );
  const use = requireStep(steps, 'ask-lantern');
  assert.ok(use.type === 'choice');
  assert.ok(use.options.some((option) => /notice/i.test(option.label)));
  const source = practiceEvidence.find(({ id }) => id === 'organizer');
  const draft = practiceEvidence.find(({ id }) => id === 'draft');
  assert.match(source?.line ?? '', /first-time visitors.*welcome desk/i);
  assert.match(draft?.line ?? '', /first-time visitors.*side door/i);
  assert.ok(use.options.some((option) => welcomeRequest.includes(option.label)));
  const replay = requireStep(steps, 'change-rule');
  assert.ok(replay.type === 'choice');
  assert.ok(replay.paragraphs?.includes(welcomeRequest));
  const revised = replay.options.find((option) => option.best);
  assert.ok(revised);
  assert.match(revised.feedback, /check in at the welcome desk/i);
  const criticism = requireStep(steps, 'mark-evidence');
  assert.ok(criticism.type === 'choice' && criticism.options.some((option) => option.best));
  const transfer = requireStep(steps, 'recommendation');
  assert.match(transfer.paragraphs?.join(' ') ?? '', /confirmation email/i);
  assert.match(transfer.criteria?.join(' ') ?? '', /request.*source.*test/is);
  assert.doesNotMatch(
    requireQuest('w01')
      .steps.map((step) => JSON.stringify(step))
      .join(' '),
    /\b(?:paper clips?|scale ratios?|multipl(?:y|ied)|glue sticks?|calculat\w*)\b/i,
  );
  const evidence = requireStep(steps, 'compare-measures');
  assert.ok(evidence.paragraphs && evidence.feedback);
  assert.match(evidence.paragraphs.join(' '), /SNAIL.*MAILS.*GLAT/s);
  assert.doesNotMatch(evidence.paragraphs.join(' '), /cross-check the original paper/i);
  assert.match(evidence.feedback, /cross-check the original paper/i);
  assert.ok(steps.findIndex((step) => step.type === 'lab') > steps.findIndex((step) => step.independent));
});

test('Week 5 keeps assistance graduated and checks worked quantities and fresh transfer evidence', () => {
  const { steps } = requireQuest('w05');
  const worked = requireStep(steps, 'paint-demonstration');
  assert.ok(worked.feedback);
  assert.match(worked.feedback, new RegExp(`\\b${(15 / 5) * 3}\\b`));
  const guided = requireStep(steps, 'guided-attempt');
  assert.ok(guided.type === 'tutor');
  assert.equal(guided.hints.length, 2);
  assert.notEqual(guided.hints[0], guided.hints[1]);
  assert.match(guided.feedback, new RegExp(`\\b${(12.5 / 5) * 2} cm\\b`));
  const transfer = requireStep(steps, 'independent-design');
  assert.ok(transfer.paragraphs && transfer.feedback === undefined);
  assert.match(transfer.paragraphs.join(' '), /12 of 20.*15 of 30/s);
});

test('students can inspect three attributed record lines and follow the same input across test runs', () => {
  const week = requireQuest('w01');
  assert.equal(week.version, 3);
  assert.equal('interaction' in requireStep(week.steps, 'opening'), true);
  const modeled = requireStep(week.steps, 'demo-evidence');
  assert.match((modeled.paragraphs ?? []).join(' '), /confiden(?:t|ce)/i);
  const guided = requireStep(week.steps, 'mark-evidence');
  assert.equal(guided.hints?.length, 2);
  const lab = requireStep(week.steps, 'response-lab');
  assert.match(lab.prompt ?? '', /original/i);
});

test('Week 2 covers the proposed archive milestones and retains source and timing alignment', () => {
  const week = requireQuest('w02');
  assert.match(week.assignment, /Case note 1.*Jan 24/i);
  assert.equal(week.minutes, 98);
  assert.deepEqual(
    week.steps.filter((step) => step.stage === 'I Do').map((step) => step.id),
    ['archive-introduction'],
  );
  assert.ok(weekTwoLesson.milestones.every((milestone) => milestone.stage === 'We Do'));
  assert.deepEqual(
    weekTwoLesson.milestones.map(({ id }) => id),
    [...weekTwoYearIds],
  );
  for (const stage of stages) {
    assert.equal(
      week.steps.filter((step) => step.stage === stage).reduce((sum, step) => sum + step.minutes, 0),
      weekTwoLesson.stageMinutes[stage],
    );
  }
  const sourceIds = new Set(weekTwoReferences.map(({ id }) => id));
  for (const { sourceIds: sources, options } of weekTwoLesson.milestones) {
    assert.ok(sources.length && sources.every((id) => sourceIds.has(id)));
    assert.equal(options.filter((option) => option.best).length, 1);
  }
  assert.equal(weekTwoLesson.milestones.at(-1)?.revealPanels?.length, 2);
  assert.equal(weekTwoLesson.replay.cards.length, 3);
});

test('the public curriculum excludes worked independent assessments', () => {
  for (const quest of [requireQuest('w01'), requireQuest('w02'), requireQuest('w05')]) {
    const transfer = quest.steps.find((step) => step.independent);
    assert.ok(transfer);
    assert.equal(transfer.feedback, undefined);
  }
});

test('the printable Week 1 activity includes each timed stage and defers transfer feedback until filing', async () => {
  const handout = await Bun.file(new URL('../public/activities/w01.html', import.meta.url)).text();
  assert.match(handout, /I Do.*30 minutes/);
  assert.match(handout, /We Do.*50 minutes/);
  assert.match(handout, /You Do.*25 minutes/);
  for (const step of requireQuest('w01').steps) assert.ok(handout.includes(`id="${step.id}"`), step.id);
  assert.match(handout, /course-only discussion/);
  assert.match(handout, /instructor example/i);
  assert.match(handout, /after your first recommendation/i);
  assert.doesNotMatch(handout, /\b(?:paper clips?|scale ratios?|multiply|glue sticks?)\b/i);
});
