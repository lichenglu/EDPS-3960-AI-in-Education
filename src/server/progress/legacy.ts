import type { ActiveQuest, ProgressState, Step, SavedCheckpoint } from '../types.ts';
import type { Queries } from '../database.ts';
import { isObject, reject, textField } from '../http.ts';
const noProgress = { revision: 0, state: null, lastSaved: null };
function isFirstAttempt(step: Step): boolean {
  return step.independent === true || step.type === 'tutor';
}

export function summarize(quest: ActiveQuest, state: ProgressState, lastSaved: string) {
  const stage = quest.steps[state.index]?.stage ?? null;
  const stages: Record<string, 'complete' | 'in-progress' | 'not-started'> = {};
  quest.steps.forEach((step, position) => {
    if (position < state.index) stages[step.stage] ??= 'complete';
    else if (step.stage === stage) stages[step.stage] = 'in-progress';
    else stages[step.stage] ??= 'not-started';
  });
  return { stage, stages, complete: state.index === quest.steps.length, lastSaved };
}

export function validateState(
  quest: ActiveQuest,
  previous: ProgressState | null,
  state: unknown,
): asserts state is ProgressState {
  const previousIndex = previous?.index ?? 0;
  if (
    !isObject(state) ||
    !isObject(state.entries) ||
    typeof state.index !== 'number' ||
    !Number.isInteger(state.index) ||
    state.index < previousIndex ||
    state.index > previousIndex + 1 ||
    state.index > quest.steps.length
  ) {
    reject(422, 'This checkpoint does not follow the last saved step.');
  }

  for (const [id, entry] of Object.entries(state.entries)) {
    const position = quest.steps.findIndex((step) => step.id === id);
    if (position === -1 || position > state.index || !isObject(entry)) {
      reject(422, 'This checkpoint contains an invalid step.');
    }
    if (isFirstAttempt(quest.steps[position])) {
      if (
        !textField(entry.first, 10_000) ||
        (entry.revision !== undefined && !textField(entry.revision, 10_000))
      ) {
        reject(422, 'Record a first attempt before adding a revision.');
      }
    }
  }

  for (const step of quest.steps) {
    if (!isFirstAttempt(step)) continue;
    const first = previous?.entries[step.id]?.first;
    const candidate = state.entries[step.id];
    if (first !== undefined && (!isObject(candidate) || first !== candidate.first)) {
      reject(422, 'The first attempt is already saved. Add a revision instead.');
    }
  }

  if (state.index > previousIndex) {
    const step = quest.steps[previousIndex];
    const candidate = state.entries[step.id];
    const entry = isObject(candidate) ? candidate : undefined;
    const selected = entry?.selected;
    const choice =
      typeof selected === 'number' && Number.isInteger(selected) ? step.options?.[selected] : undefined;
    if (
      (isFirstAttempt(step) && !entry?.first) ||
      (step.type === 'write' && !step.independent && !textField(entry?.text, 10_000)) ||
      (step.type === 'choice' &&
        (!choice || (step.options?.some((option) => option.best) && !choice.best))) ||
      (step.type === 'read' && step.feedback && entry?.revealed !== true) ||
      (step.type === 'bottle' && !textField(entry?.reflection, 10_000))
    ) {
      reject(422, 'Complete the current activity before moving on.');
    }
  }
}

export async function readProgress<State = ProgressState>(
  db: Queries,
  accountId: string,
  questId: string,
  version: string,
): Promise<{ revision: number; state: State | null; lastSaved: string | null }> {
  const query = db.query<SavedCheckpoint, [string, string, string]>(`
    SELECT revision, state, last_saved AS "lastSaved" FROM progress
    WHERE account_id = ? AND quest_id = ? AND quest_version = ?
  `);
  const row = await query.get(accountId, questId, version);
  return row
    ? {
        revision: row.revision,
        state: JSON.parse(row.state),
        lastSaved: row.lastSaved,
      }
    : noProgress;
}
