import type { WeekTwoMilestoneId } from '../curriculum/week-02/lesson.ts';

export const weekTwoQuestId = 'w02';
export const weekTwoVersion = '1';
export const weekTwoRationaleMaxLength = 1_500;

export type WeekTwoFutureProposal = {
  conceptId: string;
  humanDecisionId: string;
  evidenceId: string;
  rationale: string;
};

export type WeekTwoIntent =
  | { type: 'completeIntro' }
  | { type: 'completeMilestone'; milestoneId: WeekTwoMilestoneId; choiceId: string }
  | { type: 'completeReplay'; choiceId: string }
  | ({ type: 'completeFuture' } & WeekTwoFutureProposal);

export type WeekTwoAction = {
  actionId: string;
  expectedRevision: number;
  contentVersion: string;
  intent: WeekTwoIntent;
};

export type WeekTwoProgress = {
  introComplete: boolean;
  completedMilestones: WeekTwoMilestoneId[];
  replayComplete: boolean;
  futureComplete: boolean;
  futureProposal?: WeekTwoFutureProposal;
};

export const initialWeekTwoProgress = (): WeekTwoProgress => ({
  introComplete: false,
  completedMilestones: [],
  replayComplete: false,
  futureComplete: false,
});

export type WeekTwoCheckpoint = {
  questId: typeof weekTwoQuestId;
  contentVersion: typeof weekTwoVersion;
  revision: number;
  lastSaved: string | null;
  state: WeekTwoProgress;
};
