import type { Quest } from './types.ts';
import { weekOneVersion } from '../contracts/week-one.ts';
import { weekOne } from './week-one.ts';
import { weekFive, weekFiveVersion } from './week-05/lesson.ts';
import { courseSequence, syllabus } from './course-manifest.ts';

export type { EvidenceId, Quest, Speaker, Stage, Step, TutorRule, WeekOneInteraction } from './types.ts';

const implemented: Partial<Record<string, Pick<Quest, 'minutes' | 'objective' | 'steps'>>> = {
  w01: {
    minutes: 105,
    objective:
      'Use AI for a concrete purpose, check its output against a source, and change and test one rule. Explain what observed actions can show about AI literacy.',
    steps: weekOne,
  },
  w05: {
    minutes: 105,
    objective:
      'Design an attempt-first tutoring interaction, calibrate the hints, and write a fresh task the learner can try independently.',
    steps: weekFive,
  },
};

export const quests: Record<string, Quest> = Object.fromEntries(
  courseSequence.map((id) => {
    const [title, topic, dates, assignment] = syllabus[id];
    const number = Number(id.slice(1));
    return [
      id,
      {
        id,
        number,
        title,
        topic,
        dates,
        assignment,
        version: id === 'w01' ? Number(weekOneVersion) : id === 'w05' ? weekFiveVersion : 1,
        minutes: null,
        objective: null,
        steps: [],
        ...implemented[id],
      } satisfies Quest,
    ] as const;
  }),
);
