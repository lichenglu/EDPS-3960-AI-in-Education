import type { Step } from '../types.ts';
import { weekTwoLesson } from './lesson.ts';

const { intro, introMinutes, objective, milestones, replay, driftBottle, future } = weekTwoLesson;

export const weekTwoSteps: Step[] = [
  {
    id: 'archive-introduction',
    type: 'read',
    stage: 'I Do',
    title: 'The Tutor Archive',
    minutes: introMinutes,
    help: objective,
    paragraphs: [intro],
  },
  ...milestones.map((milestone): Step => ({
    id: `year-${milestone.id}`,
    type: 'choice',
    stage: milestone.stage,
    title: milestone.title,
    minutes: milestone.minutes,
    help: 'Record a first choice to open the archive record.',
    paragraphs: [milestone.setup],
    prompt: milestone.prompt,
    options: [...milestone.options],
  })),
  {
    id: 'tutor-replay',
    type: 'choice',
    stage: 'We Do',
    title: replay.title,
    minutes: replay.minutes,
    help: replay.hint,
    paragraphs: [replay.setup],
    prompt: replay.prompt,
    options: [...replay.options],
  },
  {
    id: 'drift-bottle',
    type: 'bottle',
    stage: 'We Do',
    title: driftBottle.title,
    minutes: driftBottle.minutes,
    help: driftBottle.replyPrompt,
    paragraphs: [driftBottle.setup],
    prompt: driftBottle.prompt,
    feedback: driftBottle.example,
  },
  {
    id: 'future-proposal',
    type: 'write',
    independent: true,
    stage: 'You Do',
    title: future.title,
    minutes: future.minutes,
    help: 'Use the archive and your own reasoning to make a recommendation.',
    paragraphs: [future.setup],
    prompt: future.prompt,
    criteria: [...future.criteria],
  },
];
