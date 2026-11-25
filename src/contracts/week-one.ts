import type { Entry, Progress } from '../game/quest-state.ts';

import type { EvidenceId } from '../curriculum/types.ts';

export const weekOneVersion = '3';
export type TutorRule = 'answer' | 'attempt-first';
export type Inspection = 'practice' | 'fresh';
export type EvidenceLine = EvidenceId;

export type WeekOneIntent = { stepId: string } & (
  | { type: 'inspectEvidence'; evidence: Inspection }
  | { type: 'attachEvidence'; evidence: EvidenceLine }
  | { type: 'selectChoice'; selected: number }
  | { type: 'writeNote' | 'predict' | 'reviseAttempt'; text: string }
  | { type: 'selectRule'; rule: TutorRule }
  | { type: 'fileFirstAttempt'; rule: TutorRule; text: string }
  | { type: 'reveal' | 'advance' | 'requestHint' | 'runReplay' }
);

export type WeekOneAction = {
  actionId: string;
  expectedRevision: number;
  contentVersion: string;
  intent: WeekOneIntent;
};

export type WeekOneEntry = Entry & {
  inspected?: Inspection[];
  evidence?: EvidenceLine;
  rule?: TutorRule;
  prediction?: string;
  replay?: boolean;
};

export type WeekOneProgress = Omit<Progress, 'entries'> & { entries: Record<string, WeekOneEntry> };
export type WeekOneCheckpoint = {
  questId: 'w01';
  contentVersion: string;
  revision: number;
  lastSaved: string | null;
  state: WeekOneProgress;
  archivedVersions?: string[];
  unlocked?: { feedback: string; replay?: string };
};

/** Earlier cases keep their own evidence IDs and the learner's original words. */
export type WeekOneArchive = {
  questId: 'w01';
  contentVersion: string;
  revision: number;
  lastSaved: string;
  state: { index: number; entries: Record<string, Record<string, unknown>> };
};
