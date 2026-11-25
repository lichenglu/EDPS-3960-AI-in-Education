import { useEffect, useId } from 'react';
import { clearTabDraft, TextEntry, useTabDraft } from '@/components/TextEntry';
import {
  practiceEvidence,
  tutorRules,
  welcomeRequest,
  transferDraft,
  transferNotice,
  transferAttempt,
  labNotice,
  labRequest,
} from '@/curriculum/week-one';
import type { Step } from '@/curriculum/types';
import { canReviseChoice } from '@/game/quest-state';
import type { TutorRule, WeekOneCheckpoint, WeekOneEntry, WeekOneIntent } from '@/contracts/week-one';
import type { Access } from '@/contracts/session';
import { Activity } from '../components/Activity';
import { TutorResponseLab } from '../lab/TutorResponseLab';

interface Props {
  step: Step;
  entry: WeekOneEntry;
  record: WeekOneCheckpoint;
  access: Access;
  disabled: boolean;
  send: (intent: WeekOneIntent) => void;
  draftKey?: string;
  review?: boolean;
}

function RecordSlip({ label, line }: (typeof practiceEvidence)[number]) {
  return (
    <article className="record-slip">
      <strong>{label}</strong>
      <p>{line}</p>
    </article>
  );
}

export function RecordSlips({ practice, fresh }: { practice: boolean; fresh: boolean }) {
  const [source, draft, freshAttempt] = practiceEvidence;
  return (
    <>
      {practice && (
        <section className="practice-record">
          <h3>The notice and Pip’s draft</h3>
          <RecordSlip {...source} />
          <p>{welcomeRequest}</p>
          <RecordSlip {...draft} />
        </section>
      )}
      {fresh && (
        <section className="practice-record">
          <h3>A fresh notice · Eunseo’s first try</h3>
          <RecordSlip {...freshAttempt} />
        </section>
      )}
    </>
  );
}

function RuleSelector({
  value,
  disabled,
  onChange,
}: {
  value?: TutorRule;
  disabled: boolean;
  onChange: (rule: TutorRule) => void;
}) {
  const group = useId();
  return (
    <fieldset className="rule-selector" disabled={disabled}>
      <legend>Pip’s response rule</legend>
      {(Object.keys(tutorRules) as TutorRule[]).map((rule) => (
        <label key={rule}>
          <input
            type="radio"
            name={group}
            value={rule}
            checked={value === rule}
            onChange={() => onChange(rule)}
          />
          {tutorRules[rule]}
        </label>
      ))}
    </fieldset>
  );
}

function FileRecommendation({ step, entry, disabled, send, record, draftKey, review = false }: Props) {
  const first = entry.first;
  const ruleKey = draftKey && draftKey + '.rule';
  const [selection, setRule] = useTabDraft(review || first ? undefined : ruleKey, entry.rule ?? '');
  const rule = selection === 'answer' || selection === 'attempt-first' ? selection : undefined;
  useEffect(() => {
    if (review || !first) return;
    clearTabDraft(ruleKey);
    if (entry.revision) clearTabDraft(draftKey);
  }, [draftKey, ruleKey, first, entry.revision, review]);
  return (
    <>
      <section className="criteria">
        <h3>What to include</h3>
        <ul>
          {step.criteria?.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      {(!first || !entry.rule) && (
        <RuleSelector
          value={first ? entry.rule : rule}
          disabled={disabled}
          onChange={(value) =>
            first ? send({ stepId: step.id, type: 'selectRule', rule: value }) : setRule(value)
          }
        />
      )}
      {!first ? (
        <TextEntry
          readOnly={review}
          label="Your independent recommendation"
          button="File first attempt"
          draftKey={draftKey}
          legacyDraft
          disabled={disabled}
          canSubmit={Boolean(rule)}
          onSubmit={(text) => {
            if (rule) send({ type: 'fileFirstAttempt', stepId: step.id, text, rule });
          }}
        />
      ) : (
        <>
          <div className="record-slip">
            <strong>Filed first attempt</strong>
            <p>{first}</p>
            {entry.rule && <p>{tutorRules[entry.rule]}</p>}
          </div>
          <details open={review || undefined}>
            <summary>Read feedback on your recommendation</summary>
            <p>{record.unlocked?.feedback}</p>
          </details>
          <details open={(review && Boolean(entry.revision)) || undefined}>
            <summary>Revise after feedback</summary>
            <TextEntry
              readOnly={review}
              label="Assisted revision"
              button="Save revision"
              draftKey={draftKey && draftKey + '.revision'}
              firstDraftKey={!entry.revision ? draftKey : undefined}
              initial={entry.revision ?? (review ? '' : first)}
              disabled={disabled}
              onSubmit={(text) => send({ type: 'reviseAttempt', stepId: step.id, text })}
            />
            {entry.revision && (
              <p>
                <strong>Saved revision</strong> {entry.revision}
              </p>
            )}
          </details>
        </>
      )}
    </>
  );
}

export function WeekOneActivity(props: Props) {
  const { step, entry, record, send, access, review = false } = props;
  const disabled = props.disabled || review;
  const revisingChoice = review && canReviseChoice(step);
  const choiceLocked = props.disabled || (review && !revisingChoice);
  const stepId = step.id;
  const sceneKey = review
    ? undefined
    : `next-move.w01.${record.contentVersion}.draft.${access.accountKey}.${stepId}`;
  const recommendationKey = review ? undefined : props.draftKey;

  const generic = (locked = choiceLocked) => (
    <Activity
      draftKey={sceneKey}
      review={review && !revisingChoice}
      step={step}
      entry={entry}
      access={access}
      questId="w01"
      disabled={locked}
      update={(patch) => {
        if (patch.selected !== undefined) send({ type: 'selectChoice', stepId, selected: patch.selected });
        else if (patch.revealed) send({ type: 'reveal', stepId });
        else if (patch.text || patch.reflection)
          send({ type: 'writeNote', stepId, text: (patch.reflection ?? patch.text)! });
      }}
    />
  );

  switch (step.interaction) {
    case 'inspect-record': {
      const practice = entry.inspected?.includes('practice') ?? false;
      const fresh = entry.inspected?.includes('fresh') ?? false;
      return (
        <>
          <RecordSlips practice={practice} fresh={fresh} />
          {fresh && (
            <>
              <p className="prompt">{step.prompt}</p>
              {generic()}
            </>
          )}
        </>
      );
    }
    case 'cite-evidence':
      return (
        <>
          <fieldset className="evidence-picker" disabled={choiceLocked}>
            <legend>Attach one line to your judgment</legend>
            {practiceEvidence.map((line) => (
              <button
                className="choice"
                key={line.id}
                aria-pressed={entry.evidence === line.id}
                onClick={() => send({ type: 'attachEvidence', stepId, evidence: line.id })}
              >
                {line.label}
              </button>
            ))}
          </fieldset>
          {generic(choiceLocked || !entry.evidence)}
          {entry.selected !== undefined && entry.evidence !== 'organizer' && (
            <p className="feedback">
              Attach the organizer’s notice. It describes where first-time visitors actually need to go.
            </p>
          )}
          {entry.selected !== undefined && (
            <>
              {step.hints?.slice(0, entry.hints ?? 0).map((hint) => (
                <p className="record-slip" key={hint}>
                  {hint}
                </p>
              ))}
              {(entry.hints ?? 0) < (step.hints?.length ?? 0) && (
                <button
                  className="button secondary"
                  disabled={disabled}
                  onClick={() => send({ type: 'requestHint', stepId })}
                >
                  Ask Yinqi for a hint
                </button>
              )}
            </>
          )}
        </>
      );
    case 'controlled-replay':
      return (
        <>
          <RuleSelector
            value={entry.rule}
            disabled={disabled}
            onChange={(rule) => send({ type: 'selectRule', stepId, rule })}
          />
          <TextEntry
            key={entry.rule}
            draftKey={sceneKey && entry.rule && sceneKey + '.prediction.' + entry.rule}
            readOnly={review}
            label="What do you predict will change?"
            button="Save prediction"
            initial={entry.prediction}
            disabled={disabled || !entry.rule}
            onSubmit={(text) => send({ type: 'predict', stepId, text })}
          />
          {entry.prediction && (
            <p>
              <strong>Your prediction</strong> {entry.prediction}
            </p>
          )}
          <button
            className="button"
            disabled={disabled || !entry.rule || !entry.prediction}
            onClick={() => send({ type: 'runReplay', stepId })}
          >
            Run the same request
          </button>
          {entry.replay && (
            <div className="record-slip" role="status">
              <strong>Original reply</strong>
              <p>{practiceEvidence[1].line}</p>
              <strong>Workbench replay</strong>
              <p>{step.options?.[entry.rule === 'attempt-first' ? 1 : 0]?.feedback}</p>
            </div>
          )}
        </>
      );
    case 'file-recommendation':
      return <FileRecommendation {...props} disabled={disabled} draftKey={recommendationKey} />;
    case 'compare-transfer': {
      const rule = record.state.entries.recommendation?.rule;
      return (
        <>
          {rule ? (
            <p>
              <strong>Your filed rule</strong> · {tutorRules[rule]}
            </p>
          ) : (
            <RuleSelector
              value={rule}
              disabled={disabled}
              onChange={(value) => send({ type: 'selectRule', stepId, rule: value })}
            />
          )}
          <div className="record-slip">
            <strong>Same notice and request</strong>
            <p>{transferNotice}</p>
            <p>{transferAttempt}</p>
          </div>
          <button
            className="button"
            disabled={disabled || !rule || entry.replay}
            onClick={() => send({ type: 'runReplay', stepId })}
          >
            Replay my filed rule
          </button>
          {entry.replay && (
            <>
              <div className="record-slip">
                <strong>Original exchange</strong>
                <p>{transferDraft}</p>
              </div>
              <div className="record-slip">
                <strong>New run · same request</strong>
                <p>{record.unlocked?.replay}</p>
              </div>
              <TextEntry
                draftKey={sceneKey && sceneKey + '.comparison'}
                readOnly={review}
                label="Compare the original and the replay"
                button="Save comparison"
                initial={entry.text}
                disabled={disabled}
                onSubmit={(text) => send({ type: 'writeNote', stepId, text })}
              />
            </>
          )}
          {entry.replay && (
            <details open={(review && Boolean(record.state.entries.recommendation?.revision)) || undefined}>
              <summary>Revise my recommendation after the replay</summary>
              <TextEntry
                draftKey={recommendationKey && recommendationKey + '.revision'}
                readOnly={review}
                label="Assisted revision"
                initial={
                  record.state.entries.recommendation?.revision ??
                  (review ? '' : record.state.entries.recommendation?.first)
                }
                button="Save revision"
                disabled={disabled}
                onSubmit={(text) => send({ type: 'reviseAttempt', stepId: 'recommendation', text })}
              />
              {record.state.entries.recommendation?.revision && (
                <p>
                  <strong>Saved revision</strong> {record.state.entries.recommendation.revision}
                </p>
              )}
            </details>
          )}
          <details>
            <summary>Optional · Try a different case</summary>
            <p>{labNotice}</p>
            <p>{labRequest}</p>
            <p>
              Select <strong>Compare tutor responses</strong> to see two replies. Each says whether it comes
              from live AI or a scripted example.
            </p>
            <TutorResponseLab token={access.token} disabled={disabled} />
          </details>
        </>
      );
    }
    default:
      return generic();
  }
}
