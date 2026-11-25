import { weekTwoFuture, weekTwoMilestones, weekTwoReplay } from '../../curriculum/week-02/lesson.ts';
import {
  initialWeekTwoProgress,
  weekTwoQuestId,
  weekTwoRationaleMaxLength,
  weekTwoVersion,
  type WeekTwoAction,
  type WeekTwoCheckpoint,
  type WeekTwoIntent,
  type WeekTwoProgress,
} from '../../contracts/week-two.ts';
import type { Database, Queries } from '../database.ts';
import { digest } from '../auth/codes.ts';
import { isObject, reject, textField } from '../http.ts';
import type { WeekTwoEvent } from '../telemetry.ts';
import { readProgress } from './legacy.ts';

const intentFields = {
  completeIntro: [],
  completeMilestone: ['milestoneId', 'choiceId'],
  completeReplay: ['choiceId'],
  completeFuture: ['conceptId', 'humanDecisionId', 'evidenceId', 'rationale'],
} satisfies Record<WeekTwoIntent['type'], string[]>;

function exactFields(fields: Record<string, unknown>, expected: string[]) {
  return (
    Object.keys(fields).length === expected.length && expected.every((key) => Object.hasOwn(fields, key))
  );
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[\w-]{1,128}$/.test(value);
}

export function parseWeekTwoAction(input: Record<string, unknown>): WeekTwoAction {
  const { actionId, expectedRevision, contentVersion, intent } = input;
  const invalid = () =>
    reject(400, 'Send a valid timeline action and checkpoint revision.', 'invalid-action');
  if (
    !exactFields(input, ['actionId', 'expectedRevision', 'contentVersion', 'intent']) ||
    !validId(actionId) ||
    typeof expectedRevision !== 'number' ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    !textField(contentVersion, 80) ||
    !isObject(intent) ||
    typeof intent.type !== 'string' ||
    !Object.hasOwn(intentFields, intent.type)
  )
    return invalid();
  const fields = intentFields[intent.type as WeekTwoIntent['type']];
  if (
    !exactFields(intent, ['type', ...fields]) ||
    fields.some((field) =>
      field === 'rationale' ? !textField(intent[field], weekTwoRationaleMaxLength) : !validId(intent[field]),
    )
  )
    return invalid();
  // Normalize field order so JSON key order cannot change the identity of a retry.
  const normalized = Object.fromEntries(['type', ...fields].map((field) => [field, intent[field]]));
  if (typeof normalized.rationale === 'string') normalized.rationale = normalized.rationale.trim();
  return { actionId, expectedRevision, contentVersion, intent: normalized as WeekTwoIntent };
}

const hasOption = (options: readonly { id: string }[], id: string) =>
  options.some((option) => option.id === id);

function transition(state: WeekTwoProgress, intent: WeekTwoIntent): WeekTwoProgress {
  const unavailable = (message: string) => reject(422, message, 'action-unavailable');
  switch (intent.type) {
    case 'completeIntro':
      if (state.introComplete) return unavailable('The introduction is already complete.');
      return { ...state, introComplete: true };
    case 'completeMilestone': {
      const next = weekTwoMilestones[state.completedMilestones.length];
      if (!state.introComplete || !next || next.id !== intent.milestoneId)
        return unavailable('Finish the earlier timeline activity first.');
      if (!hasOption(next.options, intent.choiceId)) return unavailable('Choose an available response.');
      return { ...state, completedMilestones: [...state.completedMilestones, next.id] };
    }
    case 'completeReplay':
      if (state.completedMilestones.length !== weekTwoMilestones.length || state.replayComplete)
        return unavailable('The replay opens once all historical milestones are revealed.');
      if (!hasOption(weekTwoReplay.options, intent.choiceId))
        return unavailable('Choose an available replay response.');
      return { ...state, replayComplete: true };
    case 'completeFuture': {
      if (state.futureComplete) reject(409, 'Your first proposal is already filed.', 'first-attempt-sealed');
      if (!state.replayComplete)
        return unavailable('Complete the replay before proposing the next milestone.');
      const { conceptId, humanDecisionId, evidenceId, rationale } = intent;
      if (
        !hasOption(weekTwoFuture.concepts, conceptId) ||
        !hasOption(weekTwoFuture.humanDecisions, humanDecisionId) ||
        !hasOption(weekTwoFuture.evidence, evidenceId)
      )
        return unavailable('Choose an AI action, a human decision, and a way to check learning.');
      return {
        ...state,
        futureComplete: true,
        futureProposal: { conceptId, humanDecisionId, evidenceId, rationale },
      };
    }
  }
}

export function summarizeWeekTwo(state: WeekTwoProgress, lastSaved: string) {
  return {
    stage: state.futureComplete
      ? null
      : state.replayComplete
        ? 'You Do'
        : state.introComplete
          ? 'We Do'
          : 'I Do',
    stages: {
      'I Do': state.introComplete ? 'complete' : 'in-progress',
      'We Do': state.replayComplete ? 'complete' : state.introComplete ? 'in-progress' : 'not-started',
      'You Do': state.futureComplete ? 'complete' : state.replayComplete ? 'in-progress' : 'not-started',
    },
    complete: state.futureComplete,
    lastSaved,
  };
}

function actionEvents(intent: WeekTwoIntent): WeekTwoEvent[] {
  switch (intent.type) {
    case 'completeIntro':
      return [{ week: weekTwoQuestId, name: 'week_started' }];
    case 'completeMilestone':
      return [{ week: weekTwoQuestId, name: 'mission_completed', mission: intent.milestoneId }];
    case 'completeReplay':
      return [];
    case 'completeFuture':
      return [{ week: weekTwoQuestId, name: 'week_completed' }];
  }
}

export function weekTwoStore(db: Database) {
  async function progress(learner: string, connection: Queries = db): Promise<WeekTwoCheckpoint> {
    const prior = await readProgress<WeekTwoProgress>(connection, learner, weekTwoQuestId, weekTwoVersion);
    return {
      ...prior,
      questId: weekTwoQuestId,
      contentVersion: weekTwoVersion,
      state: prior.state ?? initialWeekTwoProgress(),
    };
  }

  function commit(learner: string, action: WeekTwoAction) {
    return db.transaction('timeline-w02:' + learner, async (tx) => {
      const { actionId, expectedRevision, contentVersion, intent } = action;
      if (contentVersion !== weekTwoVersion)
        reject(409, 'This quest has changed. Reload the timeline before saving.', 'stale-content-version');
      const fingerprint = digest(JSON.stringify(intent));
      const receipt = await tx
        .query<{ intent: string }>(
          `SELECT intent FROM action_receipts
           WHERE account_id = ? AND quest_id = ? AND content_version = ? AND action_id = ?`,
        )
        .get(learner, weekTwoQuestId, contentVersion, actionId);
      const prior = await progress(learner, tx);
      if (receipt) {
        if (receipt.intent !== fingerprint)
          reject(409, 'This action ID was used for a different move.', 'action-id-reused');
        return { checkpoint: prior, events: [] };
      }
      if (expectedRevision !== prior.revision)
        reject(409, 'A newer timeline checkpoint was saved. Reload the timeline.', 'stale-revision');

      const state = transition(prior.state, intent);
      const lastSaved = new Date().toISOString();
      const revision = prior.revision + 1;
      const checkpoint: WeekTwoCheckpoint = { ...prior, state, lastSaved, revision };
      await tx.run(
        `INSERT INTO progress (account_id, quest_id, quest_version, revision, state, stage_status, last_saved)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_id, quest_id, quest_version) DO UPDATE SET revision = excluded.revision,
           state = excluded.state, stage_status = excluded.stage_status, last_saved = excluded.last_saved`,
        learner,
        weekTwoQuestId,
        weekTwoVersion,
        revision,
        JSON.stringify(state),
        JSON.stringify(summarizeWeekTwo(state, lastSaved)),
        lastSaved,
      );
      await tx.run(
        'INSERT INTO action_receipts VALUES (?, ?, ?, ?, ?, ?)',
        learner,
        weekTwoQuestId,
        contentVersion,
        actionId,
        fingerprint,
        JSON.stringify(checkpoint),
      );
      return { checkpoint, events: actionEvents(intent) };
    });
  }

  return { progress, commit };
}
