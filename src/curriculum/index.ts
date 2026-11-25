import type { Quest } from './types.ts';
import { weekOneVersion } from '../contracts/week-one.ts';
import { weekOne } from './week-one.ts';
import { weekTwoLesson } from './week-02/lesson.ts';
import { weekTwoSteps } from './week-02/steps.ts';
import { weekFive, weekFiveVersion } from './week-05/lesson.ts';
import { courseSequence, syllabus } from './course-manifest.ts';

export type { EvidenceId, Quest, Speaker, Stage, Step, TutorRule, WeekOneInteraction } from './types.ts';

const implemented: Partial<Record<string, Pick<Quest, 'version' | 'minutes' | 'objective' | 'steps'>>> = {
  w01: {
    version: Number(weekOneVersion),
    minutes: 105,
    objective:
      'Use AI for a concrete purpose, check its output against a source, and change and test one rule. Explain what observed actions can show about AI literacy.',
    steps: weekOne,
  },
  w02: {
    version: weekTwoLesson.version,
    minutes: Object.values(weekTwoLesson.stageMinutes).reduce((sum, minutes) => sum + minutes, 0),
    objective: weekTwoLesson.objective,
    steps: weekTwoSteps,
  },
  w05: {
    version: weekFiveVersion,
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
        version: 1,
        minutes: null,
        objective: null,
        steps: [],
        ...implemented[id],
      } satisfies Quest,
    ] as const;
  }),
);
