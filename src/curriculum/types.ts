import type { CharacterId } from './characters.ts';

export type Stage = 'I Do' | 'We Do' | 'You Do';
export type Speaker = 'Chenglu' | 'Yinqi' | 'Eunseo' | 'Pip';

interface Choice {
  label: string;
  feedback: string;
  best?: boolean;
}

interface Source {
  label: string;
  url: string;
}

export type WeekOneInteraction =
  'inspect-record' | 'cite-evidence' | 'controlled-replay' | 'file-recommendation' | 'compare-transfer';

export const evidenceIds = ['organizer', 'draft', 'visitor'] as const;
export type EvidenceId = (typeof evidenceIds)[number];
export type TutorRule = 'answer' | 'attempt-first';

interface StepBase {
  interaction?: WeekOneInteraction;
  id: string;
  stage: Stage;
  title: string;
  minutes: number;
  help: string;
  speaker?: Speaker | CharacterId;
  paragraphs?: string[];
  prompt?: string;
  label?: string;
  action?: string;
  feedback?: string;
  options?: Choice[];
  hints?: string[];
  criteria?: string[];
  sources?: Source[];
  independent?: boolean;
}

export type Step = StepBase &
  (
    | { type: 'read' }
    | { type: 'lab' }
    | { type: 'choice'; prompt: string; options: Choice[] }
    | { type: 'write'; prompt: string; independent?: false }
    | { type: 'write'; prompt: string; independent: true; criteria: string[]; feedback?: never }
    | { type: 'tutor'; prompt: string; hints: string[]; feedback: string }
    | { type: 'bottle'; feedback: string }
  );

export interface Quest {
  id: string;
  number: number;
  title: string;
  topic: string;
  dates: string;
  assignment: string;
  version: number;
  minutes: number | null;
  objective: string | null;
  steps: Step[];
}
