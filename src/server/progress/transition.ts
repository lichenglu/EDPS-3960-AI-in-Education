import type { WeekOneEntry, WeekOneIntent, WeekOneProgress } from '../../contracts/week-one.ts';
import { canAdvance, canReviseChoice } from '../../game/quest-state.ts';
import { reject } from '../http.ts';
import type { ActiveQuest } from '../types.ts';

function requireAction(allowed: unknown, message: string): asserts allowed {
  if (!allowed) reject(422, message, 'action-unavailable');
}

export function transition(
  quest: ActiveQuest,
  previous: WeekOneProgress,
  intent: WeekOneIntent,
  hasReply: boolean,
): WeekOneProgress {
  const { stepId } = intent;
  const entry: WeekOneEntry = { ...previous.entries[stepId] };
  const transfer = previous.entries.recommendation;
  if (intent.type === 'fileFirstAttempt' && stepId === 'recommendation' && transfer?.first)
    reject(
      409,
      'Your first recommendation is already filed. Save your draft as a revision.',
      'first-attempt-sealed',
    );
  // A separate revision can be recorded from the replay desk or a finished notebook.
  if (intent.type === 'reviseAttempt') {
    requireAction(
      stepId === 'recommendation' && transfer?.first,
      'File a first recommendation before adding a revision.',
    );
    return {
      ...previous,
      entries: { ...previous.entries, recommendation: { ...transfer, revision: intent.text } },
    };
  }
  const position = quest.steps.findIndex((step) => step.id === stepId);
  const step = quest.steps[position];
  requireAction(step && position <= previous.index, 'Open an available activity to make this move.');
  if (position < previous.index) {
    const editingChoice =
      intent.type === 'selectChoice' || (intent.type === 'attachEvidence' && stepId === 'mark-evidence');
    requireAction(
      editingChoice && canReviseChoice(step),
      'This move is only available in the current activity.',
    );
  }
  switch (intent.type) {
    case 'advance':
      requireAction(canAdvance(step, entry), 'Finish the current activity before continuing.');
      if (stepId === 'opening')
        requireAction(entry.inspected?.includes('fresh'), 'Inspect both records first.');
      if (stepId === 'change-rule')
        requireAction(
          entry.rule === 'attempt-first' && entry.replay,
          'Test the rule that asks about the source before continuing.',
        );
      if (stepId === 'recommendation') requireAction(entry.rule, 'Choose a rule for the replay.');
      if (stepId === 'response-lab')
        requireAction(entry.replay && entry.text?.trim(), 'Run your saved rule and write a comparison.');
      if (stepId === 'drift-bottle')
        requireAction(hasReply, 'Send your own bottle and reply to a peer or the example.');
      return { ...previous, index: previous.index + 1 };
    case 'inspectEvidence':
      requireAction(stepId === 'opening', 'Open the welcome desk to inspect a record.');
      requireAction(
        intent.evidence === 'practice' || entry.inspected?.includes('practice'),
        'Inspect the organizer’s notice first.',
      );
      entry.inspected = [...new Set([...(entry.inspected ?? []), intent.evidence])];
      break;
    case 'selectChoice':
      requireAction(
        canReviseChoice(step) && step.options?.[intent.selected],
        'Choose one of the available options.',
      );
      if (stepId === 'opening')
        requireAction(
          entry.inspected?.includes('practice') && entry.inspected.includes('fresh'),
          'Inspect both records before choosing.',
        );
      if (stepId === 'mark-evidence')
        requireAction(entry.evidence, 'Attach a line before filing a judgment.');
      entry.selected = intent.selected;
      break;
    case 'attachEvidence':
      requireAction(stepId === 'mark-evidence', 'Open the guided evidence record first.');
      entry.evidence = intent.evidence;
      delete entry.selected;
      break;
    case 'reveal':
      requireAction(step.type === 'read', 'This activity has no demonstration to reveal.');
      entry.revealed = true;
      break;
    case 'writeNote':
      requireAction(
        (step.type === 'write' && !step.independent) ||
          stepId === 'response-lab' ||
          stepId === 'drift-bottle',
        'Use this activity’s recording control.',
      );
      if (stepId === 'response-lab')
        requireAction(entry.replay, 'Run the replay before recording the comparison.');
      if (stepId === 'drift-bottle') {
        requireAction(hasReply, 'Reply to a classmate or the example before recording your reflection.');
        Object.assign(entry, { sent: true, responded: true, reflection: intent.text });
      } else entry.text = intent.text;
      break;
    case 'selectRule':
      if ((stepId === 'recommendation' || stepId === 'response-lab') && transfer?.first && !transfer.rule) {
        return {
          ...previous,
          entries: { ...previous.entries, recommendation: { ...transfer, rule: intent.rule } },
        };
      }
      requireAction(stepId === 'change-rule', 'Choose the tutor rule at the workbench.');
      entry.rule = intent.rule;
      delete entry.prediction;
      delete entry.replay;
      delete entry.selected;
      break;
    case 'predict':
      requireAction(stepId === 'change-rule' && entry.rule, 'Choose a rule before predicting a result.');
      entry.prediction = intent.text;
      delete entry.replay;
      delete entry.selected;
      break;
    case 'runReplay':
      if (stepId === 'response-lab')
        requireAction(
          transfer?.first && transfer.rule,
          'File a recommendation and choose its rule before replaying.',
        );
      else {
        requireAction(
          stepId === 'change-rule' && entry.rule && entry.prediction,
          'Select a rule and predict what will happen first.',
        );
        entry.selected = entry.rule === 'attempt-first' ? 1 : 0;
      }
      entry.replay = true;
      break;
    case 'requestHint':
      requireAction(
        stepId === 'mark-evidence' && entry.selected !== undefined,
        'Try a judgment before asking for a hint.',
      );
      entry.hints = Math.min(2, (entry.hints ?? 0) + 1);
      break;
    case 'fileFirstAttempt':
      requireAction(stepId === 'recommendation', 'Open the independent recommendation before filing.');
      entry.first = intent.text;
      entry.rule = intent.rule;
      break;
  }
  return { ...previous, entries: { ...previous.entries, [stepId]: entry } };
}
