import { useState, useRef, useEffect } from 'react';
import { errorMessage, RequestError } from '@/lib/api-client';
import type { Access } from '@/contracts/session';
import { getProgress, saveProgress, type RecordState } from '../api/legacy-progress';
import {
  advance,
  canAdvance,
  emptyProgress,
  stageProgress,
  stages,
  updateEntry,
  type Progress,
} from '@/game/quest-state';
import { courseCast, type CharacterId } from '@/curriculum/characters';
import type { Quest } from '@/curriculum';
import { DriftBottle } from '../bottles/DriftBottle';
import { Activity } from './Activity';
import './quest-player.css';

export function QuestPlayer({
  quest,
  access,
  signOut,
}: {
  quest: Quest;
  access: Access;
  signOut: () => void;
  textView?: boolean;
}) {
  const [record, setRecord] = useState<RecordState>();
  const [draft, setDraft] = useState<Progress>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState<RecordState>();
  const focusHeading = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);
  const state = record?.state ?? emptyProgress();
  const step = quest.steps[state.index];
  const entry = step ? (state.entries[step.id] ?? {}) : {};
  const speakerId = step?.speaker?.toLowerCase() as CharacterId | undefined;
  const speaker = speakerId && courseCast[speakerId];

  async function load() {
    setMessage('');
    try {
      setRecord(await getProgress(quest.id, access.token));
    } catch (error) {
      setMessage(errorMessage(error, 'Progress could not be loaded.'));
    }
  }

  useEffect(() => {
    void load();
  }, [quest.id, access.token]);
  useEffect(() => {
    if (focusHeading.current) {
      heading.current?.focus();
      focusHeading.current = false;
    }
  }, [state.index]);

  async function save(next: Progress) {
    if (!record || locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('Saving…');
    setDraft(next);
    try {
      const saved = await saveProgress(quest.id, access.token, record.revision, next);
      setRecord(saved);
      setDraft(undefined);
      setMessage('Saved');
    } catch (error) {
      if (error instanceof RequestError && error.status === 409) {
        const latest = error.payload as RecordState;
        if (JSON.stringify(latest.state) === JSON.stringify(next)) {
          setRecord(latest);
          setDraft(undefined);
          setMessage('Saved');
        } else {
          setConflict(latest);
          setMessage('A newer checkpoint was saved in another tab. Load that checkpoint to continue.');
        }
      } else {
        setMessage(errorMessage(error, 'Progress could not be saved. Your change is still here.'));
      }
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }

  if (!record)
    return (
      <div className="panel">
        <p role="status">{message || 'Loading saved progress…'}</p>
        {message && (
          <div className="actions">
            <button className="button" onClick={() => void load()}>
              Try again
            </button>
            <button className="text-button" onClick={signOut}>
              Use a different code
            </button>
          </div>
        )}
      </div>
    );

  const lockedAction = busy || Boolean(draft);
  const progress = stageProgress(quest.steps, state);
  const bottleIndex = quest.steps.findIndex((item) => item.type === 'bottle');
  const bottle = quest.steps[bottleIndex];
  return (
    <div className="field-journal">
      <div className="quest-layout">
        <aside className="quest-sidebar" aria-label="Quest progress">
          <h2>Quest progress</h2>
          <ol className="stage-list">
            {stages.map((stage, index) => (
              <li
                className={step?.stage === stage ? 'current' : ''}
                aria-current={step?.stage === stage ? 'step' : undefined}
                key={stage}
              >
                <div>
                  <strong>{stage}</strong>
                  <span>{progress[index] === 100 ? 'Complete' : `${progress[index]}%`}</span>
                </div>
                <progress aria-label={`${stage} progress`} value={progress[index]} max={100} />
              </li>
            ))}
          </ol>
          <p className="objective">{quest.objective}</p>
          <p className="connection">
            {access.label}{' '}
            <button className="text-button" onClick={signOut}>
              Sign out
            </button>
          </p>
        </aside>
        <section className="panel story-panel" aria-labelledby="step-title">
          <div className="save-line">
            <span role="status" aria-live="polite">
              {message || (record.lastSaved ? 'Saved' : 'Progress saves as you go')}
            </span>
            {!busy &&
              draft &&
              (conflict ? (
                <button
                  className="text-button"
                  onClick={() => {
                    focusHeading.current = true;
                    setRecord(conflict);
                    setConflict(undefined);
                    setDraft(undefined);
                    setMessage('Latest checkpoint loaded.');
                  }}
                >
                  Load latest saved work
                </button>
              ) : (
                <button className="text-button" onClick={() => void save(draft)}>
                  Retry save
                </button>
              ))}
          </div>
          {step ? (
            <div className="step">
              <div className="step-meta">
                <p className="eyebrow">
                  {step.stage}
                  {step.minutes ? ` · ${step.minutes} min` : ''}
                </p>
                <span>
                  {state.index + 1} of {quest.steps.length}
                </span>
              </div>
              <h2 id="step-title" ref={heading} tabIndex={-1}>
                {step.title}
              </h2>
              {speaker && (
                <div className={`speaker speaker-${speakerId}`}>
                  <span aria-hidden="true">{speakerId === 'pip' ? '✦' : speaker.name.charAt(0)}</span>
                  <strong>{speaker.name}</strong>
                </div>
              )}
              <div className="story-copy">
                {step.paragraphs?.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              {step.prompt && <p className="prompt">{step.prompt}</p>}
              {step.sources && (
                <ul className="sources">
                  {step.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <details className="how">
                <summary>How this works</summary>
                <p>{step.help}</p>
              </details>
              <Activity
                key={step.id}
                step={step}
                entry={entry}
                filedFeedback={record.unlocked?.feedback}
                disabled={lockedAction}
                access={access}
                questId={quest.id}
                update={(value) => void save(updateEntry(state, step.id, value))}
              />
              <div className="step-actions">
                <button
                  type="button"
                  className="button"
                  disabled={lockedAction || !canAdvance(step, entry)}
                  onClick={() => {
                    focusHeading.current = true;
                    void save(advance(quest.steps, state));
                  }}
                >
                  {state.index + 1 === quest.steps.length ? 'Finish quest' : 'Continue'}
                </button>
              </div>
            </div>
          ) : (
            <div className="step completed">
              <p className="eyebrow">I Do · We Do · You Do</p>
              <h2 id="step-title" tabIndex={-1} ref={heading}>
                Quest complete
              </h2>
              <p>{quest.assignment}. Use the Canvas module to submit your work.</p>
              <a className="button" href="/">
                All quests
              </a>
            </div>
          )}
        </section>
      </div>
      {bottle && state.index > bottleIndex && (
        <details className="return-bottle">
          <summary>Reopen the Drift Bottle shelf</summary>
          <DriftBottle
            token={access.token}
            id={quest.id}
            fallback={bottle.feedback ?? ''}
            entry={state.entries[bottle.id] ?? {}}
            onEntry={() => undefined}
            disabled={lockedAction}
          />
        </details>
      )}
    </div>
  );
}
