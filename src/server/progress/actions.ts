import { evidenceIds } from '../../curriculum/types.ts';
import { weekOneVersion, type WeekOneAction, type WeekOneIntent } from '../../contracts/week-one.ts';
import { isObject, reject, textField } from '../http.ts';

const payloadKeys = {
  inspectEvidence: ['evidence'],
  attachEvidence: ['evidence'],
  selectChoice: ['selected'],
  writeNote: ['text'],
  predict: ['text'],
  reviseAttempt: ['text'],
  selectRule: ['rule'],
  fileFirstAttempt: ['rule', 'text'],
  reveal: [],
  advance: [],
  requestHint: [],
  runReplay: [],
} satisfies Record<WeekOneIntent['type'], string[]>;

function hasKeys(input: Record<string, unknown>, keys: string[]) {
  return Object.keys(input).length === keys.length && keys.every((key) => Object.hasOwn(input, key));
}

export function parseAction(input: Record<string, unknown>): WeekOneAction {
  const { actionId, expectedRevision, contentVersion, intent } = input;
  const invalid = () => reject(400, 'Send a valid quest action and checkpoint revision.', 'invalid-action');
  if (
    !hasKeys(input, ['actionId', 'expectedRevision', 'contentVersion', 'intent']) ||
    typeof actionId !== 'string' ||
    !/^[\w-]{1,128}$/.test(actionId) ||
    typeof expectedRevision !== 'number' ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    !textField(contentVersion, 80) ||
    !isObject(intent)
  )
    return invalid();
  const { type, stepId } = intent;
  if (typeof type !== 'string' || !Object.hasOwn(payloadKeys, type) || !textField(stepId, 120))
    return invalid();
  // A retry from the earlier kit case may still need its original receipt.
  const validEvidence: readonly string[] =
    contentVersion === weekOneVersion ? evidenceIds : [...evidenceIds, 'seven', 'nine', 'five'];
  const keys = payloadKeys[type as WeekOneIntent['type']];
  if (!hasKeys(intent, ['type', 'stepId', ...keys])) return invalid();
  if (
    ('text' in intent && !textField(intent.text, 10_000)) ||
    ('rule' in intent && intent.rule !== 'answer' && intent.rule !== 'attempt-first') ||
    ('selected' in intent &&
      (typeof intent.selected !== 'number' ||
        !Number.isSafeInteger(intent.selected) ||
        intent.selected < 0)) ||
    (type === 'attachEvidence' &&
      (typeof intent.evidence !== 'string' || !validEvidence.includes(intent.evidence))) ||
    (type === 'inspectEvidence' && intent.evidence !== 'practice' && intent.evidence !== 'fresh')
  )
    return invalid();

  // Fixed field order ensures a client's JSON key order never affects a retry.
  const normalized = Object.fromEntries(
    ['type', 'stepId', ...keys].map((key) => [key, intent[key]]),
  ) as WeekOneIntent;
  return { actionId, expectedRevision, contentVersion, intent: normalized };
}
