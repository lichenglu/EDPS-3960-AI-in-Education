import type { EvidenceId, TutorRule, WeekOneInteraction } from '../curriculum/types.ts';

export const stages = ['I Do', 'We Do', 'You Do'] as const;

export type Entry = {
  inspected?: ('practice' | 'fresh')[];
  evidence?: EvidenceId;
  rule?: TutorRule;
  prediction?: string;
  replay?: boolean;
  selected?: number;
  revealed?: boolean;
  first?: string;
  revision?: string;
  text?: string;
  hints?: number;
  sent?: boolean;
  responded?: boolean;
  reflection?: string;
};

export type Progress = { index: number; entries: Record<string, Entry> };
type StepRule = {
  id: string;
  stage: string;
  type: string;
  options?: readonly { best?: boolean }[];
  feedback?: string;
  independent?: boolean;
  interaction?: WeekOneInteraction;
};

export function emptyProgress(): Progress {
  return { index: 0, entries: {} };
}

export function updateEntry(state: Progress, id: string, entry: Entry): Progress {
  return { ...state, entries: { ...state.entries, [id]: entry } };
}

export function canReviseChoice(step: Pick<StepRule, 'type' | 'interaction'>) {
  return step.type === 'choice' && step.interaction !== 'controlled-replay';
}

export function canAdvance(step: Omit<StepRule, 'id' | 'stage'>, entry: Entry = {}) {
  switch (step.interaction) {
    case 'inspect-record':
      if (!entry.inspected?.includes('practice') || !entry.inspected.includes('fresh')) return false;
      break;
    case 'cite-evidence':
      if (entry.evidence !== 'organizer') return false;
      break;
    case 'controlled-replay':
      return entry.rule === 'attempt-first' && Boolean(entry.prediction?.trim()) && entry.replay === true;
    case 'file-recommendation':
      if (!entry.rule) return false;
      break;
    case 'compare-transfer':
      return entry.replay === true && Boolean(entry.text?.trim());
  }
  switch (step.type) {
    case 'read':
      return !step.feedback || entry.revealed === true;
    case 'choice': {
      const option = entry.selected === undefined ? undefined : step.options?.[entry.selected];
      return Boolean(option && (option.best === true || !step.options?.some(({ best }) => best === true)));
    }
    case 'write':
      return Boolean((step.independent ? entry.first : entry.text)?.trim());
    case 'tutor':
      return Boolean(entry.first?.trim());
    case 'bottle':
      return Boolean(entry.sent && entry.responded && entry.reflection?.trim());
    case 'lab':
      return true;
    default:
      return false;
  }
}

export function advance(steps: readonly StepRule[], state: Progress): Progress {
  const step = steps[state.index];
  if (!step || !canAdvance(step, state.entries[step.id])) return state;
  return { ...state, index: state.index + 1 };
}

export function stageProgress(steps: readonly StepRule[], state: Progress) {
  return stages.map((stage) => {
    const inStage = steps.filter((step) => step.stage === stage).length;
    const finished = steps.slice(0, state.index).filter((step) => step.stage === stage).length;
    return inStage ? Math.round((finished * 100) / inStage) : 0;
  });
}
