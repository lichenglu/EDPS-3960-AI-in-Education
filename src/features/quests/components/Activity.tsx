import type { Access } from '@/contracts/session';
import type { Entry } from '@/game/quest-state';
import type { Step } from '@/curriculum';
import { TextEntry } from '@/components/TextEntry';
import { TutorResponseLab } from '../lab/TutorResponseLab';
import { DriftBottle } from '../bottles/DriftBottle';

export function Activity({
  step,
  entry,
  update,
  access,
  disabled: busy,
  questId,
  filedFeedback,
  review = false,
  draftKey,
}: {
  step: Step;
  entry: Entry;
  update: (entry: Entry) => void;
  access: Access;
  disabled: boolean;
  questId: string;
  filedFeedback?: string;
  review?: boolean;
  draftKey?: string;
}) {
  const disabled = busy || review;
  if (step.type === 'read')
    return (
      step.feedback && (
        <>
          {entry.revealed ? (
            <div className="feedback">
              <p>{step.feedback}</p>
            </div>
          ) : (
            <button
              className="button secondary"
              disabled={disabled}
              onClick={() => update({ revealed: true })}
            >
              {step.action ?? 'Reveal example'}
            </button>
          )}
        </>
      )
    );

  if (step.type === 'choice')
    return (
      <>
        <div className="choices" role="group" aria-label="Choices">
          {step.options.map((option, index) => (
            <button
              className="choice"
              key={option.label}
              type="button"
              aria-pressed={entry.selected === index}
              disabled={disabled}
              onClick={() => update({ selected: index })}
            >
              {option.label}
            </button>
          ))}
        </div>
        {entry.selected !== undefined && step.options[entry.selected] && (
          <div className="feedback" role="status">
            <p>{step.options[entry.selected].feedback}</p>
          </div>
        )}
      </>
    );

  if (step.type === 'write') {
    if (step.independent)
      return (
        <>
          <section className="criteria">
            <h3>What to include</h3>
            <ul>
              {step.criteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </section>
          {!entry.first ? (
            <TextEntry
              readOnly={review}
              label={step.label ?? 'Your independent response'}
              button="Submit first attempt"
              onSubmit={(first) => update({ first })}
              disabled={disabled}
            />
          ) : (
            <>
              <div className="feedback">
                <strong>Independent first attempt</strong>
                <p>{entry.first}</p>
              </div>
              <div className="feedback">
                <strong>Feedback for your next attempt</strong>
                <p>{filedFeedback}</p>
              </div>
              <details open={(review && Boolean(entry.revision)) || undefined}>
                <summary>Revise after feedback</summary>
                <TextEntry
                  readOnly={review}
                  label="Assisted revision"
                  initial={entry.revision ?? (review ? '' : entry.first)}
                  button="Save revision"
                  disabled={disabled}
                  onSubmit={(revision) => update({ ...entry, revision })}
                />
              </details>
            </>
          )}
        </>
      );
    return (
      <>
        <TextEntry
          draftKey={draftKey && draftKey + '.text'}
          readOnly={review}
          label={step.label ?? 'Your response'}
          button={step.action ?? 'Save response'}
          initial={entry.text ?? ''}
          disabled={disabled}
          onSubmit={(text) => update({ text })}
        />
        {entry.text && step.feedback && (
          <div className="feedback">
            <strong>Compare your response</strong>
            <p>{step.feedback}</p>
          </div>
        )}
      </>
    );
  }

  if (step.type === 'tutor')
    return (
      <>
        {!entry.first ? (
          <TextEntry
            readOnly={review}
            label={step.label ?? 'Your first attempt'}
            button="Record first attempt"
            disabled={disabled}
            onSubmit={(first) => update({ first, hints: 0 })}
          />
        ) : (
          <>
            <div className="feedback">
              <strong>First attempt</strong>
              <p>{entry.first}</p>
            </div>
            {step.hints.slice(0, entry.hints ?? 0).map((hint, index) => (
              <div className="feedback" key={hint}>
                <strong>Hint {index + 1}</strong>
                <p>{hint}</p>
              </div>
            ))}
            {(entry.hints ?? 0) < step.hints.length && (
              <button
                className="button secondary"
                disabled={disabled}
                onClick={() => update({ ...entry, hints: (entry.hints ?? 0) + 1 })}
              >
                {entry.hints ? 'Get another hint' : 'Get a hint'}
              </button>
            )}
            <TextEntry
              readOnly={review}
              label="Try the next step"
              button="Save retry"
              initial={entry.revision ?? ''}
              disabled={disabled}
              onSubmit={(revision) => update({ ...entry, revision })}
            />
            {entry.revision && (
              <div className="feedback">
                <strong>Worked feedback</strong>
                <p>{step.feedback}</p>
              </div>
            )}
          </>
        )}
      </>
    );

  if (step.type === 'bottle')
    return (
      <DriftBottle
        draftKey={draftKey}
        review={review}
        token={access.token}
        id={questId}
        fallback={step.feedback ?? ''}
        entry={entry}
        onEntry={update}
        disabled={disabled}
      />
    );
  if (step.type === 'lab') return <TutorResponseLab token={access.token} disabled={disabled} />;
  return null;
}
