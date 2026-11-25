import { useContext, useEffect, useState, type ReactNode } from 'react';
import { StudioWork } from './studio-progress';
import { ClassroomClip, clipStarts, formatClipTime } from './browser-audio';
import {
  apps,
  buckets,
  chatReply,
  chatTests,
  examples,
  fields,
  garbled,
  guards,
  heldOutTickets,
  hintRules,
  matchingMismatches,
  reading,
  readingShelf,
  reasoning,
  sensitive,
  speakerAccuracy,
  tickets,
  transcript,
  type Bucket,
} from '@/curriculum/week-01/cases';
import type { StudioMission as MissionId, StudioPhase as Stage } from '@/contracts/studio';

export const storagePrefix = 'classroom-studio.v1.';
export const roles = { run: 'User', tune: 'Developer', audit: 'Critic' } as const;
type StudioToolProps = { stage: Stage; award: () => void; instructor: boolean };
type Check = [label: string, passed: boolean];

export function load<T>(key: string, initial: T): T {
  try {
    return JSON.parse(localStorage.getItem(storagePrefix + key) ?? 'null') ?? initial;
  } catch {
    return initial;
  }
}
export function store<T>(key: string, value: T) {
  try {
    localStorage.setItem(storagePrefix + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function useWork<T extends Record<string, unknown>>(id: MissionId, initial: T, persist = true) {
  const key = 'work.' + id;
  const connected = useContext(StudioWork);
  const save = connected?.save;
  const [value, setValue] = useState(() => {
    if (!persist) return initial;
    return connected ? ({ ...initial, ...connected.work[id] } as T) : load(key, initial);
  });
  useEffect(() => {
    if (!persist) return;
    if (save) save(id, value);
    else store(key, value);
  }, [id, key, persist, save, value]);
  return [value, (patch: Partial<T>) => setValue((current) => ({ ...current, ...patch }))] as const;
}
function toggle<T>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}
function Checks({ stage, checks, hint, award }: StudioToolProps & { checks: Check[]; hint?: string }) {
  const passed = checks.every(([, done]) => done);
  useEffect(() => {
    if (passed) award();
  }, [passed, award]);
  return (
    <section className="checkpoint" aria-label={roles[stage] + ' Star checklist'}>
      <div>
        <strong className={stage}>★ {roles[stage]} Star</strong>
        <ul>
          {checks.map(([label, done]) => (
            <li key={label}>
              <span aria-hidden>{done ? '✓' : '○'}</span>
              <span className="sr">{done ? 'Done. ' : 'To do. '}</span>
              {label}
            </li>
          ))}
        </ul>
      </div>
      {hint && (
        <details>
          <summary>Need a hint?</summary>
          <p>{hint}</p>
        </details>
      )}
    </section>
  );
}
function Meter({ label, value, target }: { label: string; value: number; target?: number }) {
  return (
    <div className="meter">
      <div>
        <strong>{label}</strong>
        <output>
          {value}%{target !== undefined && <small> · Goal {target}%</small>}
        </output>
      </div>
      <progress aria-label={label} value={value} max={100} />
    </div>
  );
}
function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="setting">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
function Task({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="task">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
function Order({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="options">
      {options.map((label) => (
        <button
          type="button"
          className="card-button"
          key={label}
          aria-pressed={selected.includes(label)}
          onClick={() => onChange(toggle(selected, label))}
        >
          <span aria-hidden>{selected.includes(label) ? selected.indexOf(label) + 1 + ' · ' : '+ '}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

const normalize = (value: string) => value.trim().toLowerCase().replaceAll('.', '');

export function TranscriptTool(props: StudioToolProps & { mute: boolean }) {
  const { stage, mute, instructor } = props;
  const [s, update] = useWork(
    'transcript',
    {
      ran: false,
      verified: [] as number[],
      words: [] as string[],
      diarize: false,
      uncertainty: false,
      accuracy: 71,
      revision: [] as string[],
      train: true,
      local: false,
      redacted: [] as string[],
      chart: false,
      flagged: false,
      auditTried: false,
      auditChecked: false,
    },
    !instructor,
  );
  const [replay, setReplay] = useState<{ line: number; request: number }>();
  const [clue, setClue] = useState<number>();
  const [entry, setEntry] = useState('');
  const [message, setMessage] = useState('');
  const [word, setWord] = useState('');
  const [exported, setExported] = useState(false);
  const [triedClue, setTriedClue] = useState<number>();
  useEffect(() => setMessage(''), [stage]);
  const score = 71 + s.words.length * 6 + (s.diarize ? 5 : 0) + (s.uncertainty ? 3 : 0);
  const safe = !s.train && s.local && s.redacted.length === 2 && s.chart && s.flagged;
  function openClue(index: number) {
    setClue(index);
    setReplay((previous) => ({ line: garbled[index].line, request: (previous?.request ?? 0) + 1 }));
    setEntry('');
    setMessage('');
    setTriedClue(undefined);
  }
  function updateAudit(patch: Partial<typeof s>) {
    update({ ...patch, auditChecked: false });
  }
  const sharedCopy =
    transcript
      .map((line) =>
        s.redacted.reduce(
          (text, detail) => text.replaceAll(detail, '[redacted]'),
          line.speaker + ': ' + line.text,
        ),
      )
      .join('\n') + '\n\nXimena’s lines are flagged for manual review.';
  return (
    <>
      {stage === 'run' && (
        <>
          <ClassroomClip replay={replay} mute={mute} />
          <button className="primary" onClick={() => update({ ran: true })}>
            Transcribe
          </button>
          {s.ran && (
            <>
              <Meter label="First-pass accuracy" value={71} />
              <ol className="transcript" aria-label="Draft transcript">
                {transcript.map((line, index) => {
                  const broken = garbled.findIndex((item) => item.line === index);
                  const issue = garbled[broken];
                  return (
                    <li key={index}>
                      <span className="time">{formatClipTime(clipStarts[index])}</span>
                      <span>
                        {index === 3 && s.verified.includes(2) && 'Ximena: '}
                        {index === 2 && !s.verified.includes(1) && (
                          <button className="mark" onClick={() => openClue(1)}>
                            Ms. Oak Folder
                          </button>
                        )}
                        {index === 2 && (s.verified.includes(1) ? 'Ms. Okafor: ' : ': ')}
                        {index === 3 && !s.verified.includes(2) && (
                          <button className="mark" onClick={() => openClue(2)}>
                            Jimena
                          </button>
                        )}
                        {broken === 0 && !s.verified.includes(0) ? (
                          <>
                            {line.text.split('mariposa')[0]}
                            <button className="mark" onClick={() => openClue(0)}>
                              {issue.wrong}
                            </button>
                            {line.text.split('mariposa')[1]}
                          </>
                        ) : (
                          line.text
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {clue !== undefined && (
                <form
                  className="callout"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (normalize(entry) === normalize(garbled[clue].word)) {
                      update({ verified: [...new Set([...s.verified, clue])] });
                      setClue(undefined);
                      setMessage('Word verified.');
                    } else {
                      setTriedClue(clue);
                      setMessage('Compare your answer with the source and try again.');
                    }
                  }}
                >
                  <label>
                    Replay clue · {formatClipTime(clipStarts[garbled[clue].line])}
                    <input
                      value={entry}
                      onChange={(event) => setEntry(event.target.value)}
                      placeholder="Enter the word"
                      required
                      maxLength={100}
                    />
                  </label>
                  <p>Play the clip from this cue or open its text transcript. Enter what you hear or read.</p>
                  <button className="quiet">Verify word</button>
                  {triedClue === clue && (
                    <details open>
                      <summary>More help with this word</summary>
                      <p>
                        {garbled[clue].clue} Type {garbled[clue].word}.
                      </p>
                    </details>
                  )}
                </form>
              )}
              {message && <p role="status">{message}</p>}
            </>
          )}
          <Checks
            {...props}
            checks={[
              ['Transcribe the clip', s.ran],
              ['Verify three highlighted words', s.verified.length === 3],
            ]}
            hint={
              triedClue !== undefined || s.verified.length > 0
                ? 'Listen for the person’s own pronunciation or spelling. Open the clip transcript for the same evidence in text.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'tune' && (
        <>
          <Task title="Custom word bank">
            <p>Add the three terms you verified in Run so the tool can recognize them next time.</p>
            <form
              className="inline"
              onSubmit={(event) => {
                event.preventDefault();
                const match = garbled.find((item) => normalize(item.word) === normalize(word));
                if (!match) {
                  setMessage('Check the spelling against the words you verified.');
                  return;
                }
                update({ words: [...new Set([...s.words, match.word])] });
                setWord('');
                setMessage('Word bank updated.');
              }}
            >
              <label>
                Term <input value={word} onChange={(event) => setWord(event.target.value)} />
              </label>
              <button className="quiet">Add term</button>
            </form>
            {s.words.length > 0 && <p className="chips">{s.words.join(' · ')}</p>}
          </Task>
          <Task title="Transcription rules">
            <Switch
              label="Speaker diarization · separate speakers"
              checked={s.diarize}
              onChange={() => update({ diarize: !s.diarize })}
            />
            <Switch
              label="Mark muffled audio [unclear] instead of guessing"
              checked={s.uncertainty}
              onChange={() => update({ uncertainty: !s.uncertainty })}
            />
          </Task>
          <button
            className="primary"
            onClick={() => {
              const revision = transcript.map((line, index) => {
                const name = garbled.find(
                  (item) => item.word === line.speaker && !s.words.includes(item.word),
                );
                const term = s.words.includes('mariposa')
                  ? line.text
                  : line.text.replace('mariposa', 'Mary pose');
                const words = s.uncertainty ? term : term.replace('[unclear]', 'fence');
                return (s.diarize || index === 0 ? (name?.wrong ?? line.speaker) + ': ' : '') + words;
              });
              update({ accuracy: score, revision });
              setMessage(
                score >= 94
                  ? 'Transcript improved. Check sharing settings before export.'
                  : 'Re-run complete. Check remaining vocabulary and speaker settings.',
              );
            }}
          >
            Re-run
          </button>
          <Meter label="Overall accuracy" value={s.accuracy} target={94} />
          {message && <p role="status">{message}</p>}
          {!!s.revision?.length && (
            <details>
              <summary>Compare the revised transcript</summary>
              <ol>
                {s.revision.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ol>
            </details>
          )}
          <Checks
            {...props}
            checks={[
              ['Add three terms', s.words.length === 3],
              ['Separate speakers and mark muffled audio', s.diarize && s.uncertainty],
              ['Reach 94% on a re-run', s.accuracy >= 94],
            ]}
            hint={
              s.revision?.length
                ? 'Custom vocabulary repairs names. Speaker detection fixes merged turns. The uncertainty rule prevents invented words.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'audit' && (
        <>
          <Task title="Data settings">
            <Switch
              label="Use uploads to train our model"
              checked={s.train}
              onChange={() => updateAudit({ train: !s.train })}
            />
            <label className="setting">
              Processing
              <select
                aria-label="Processing"
                value={s.local ? 'local' : 'cloud'}
                onChange={(event) => updateAudit({ local: event.target.value === 'local' })}
              >
                <option value="cloud">Cloud</option>
                <option value="local">Local / Zero-Retention</option>
              </select>
            </label>
          </Task>
          <Task title="Privacy redaction brush">
            <p>Click the personal details in the shared copy to cover them.</p>
            <ol className="transcript">
              {transcript.map((line, index) => {
                const item = sensitive.find((value) => line.text.includes(value));
                return (
                  <li key={index}>
                    <strong>{line.speaker}</strong>
                    <span>
                      {item ? (
                        <>
                          {line.text.split(item)[0]}
                          <button
                            className={'mark ' + (s.redacted.includes(item) ? 'redacted' : '')}
                            aria-label={
                              s.redacted.includes(item) ? 'Restore hidden detail' : 'Redact ' + item
                            }
                            onClick={() => updateAudit({ redacted: toggle(s.redacted, item) })}
                          >
                            {s.redacted.includes(item) ? '[redacted]' : item}
                          </button>
                          {line.text.split(item)[1]}
                        </>
                      ) : (
                        line.text
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Task>
          <button className="quiet" onClick={() => update({ chart: true })}>
            Open per-speaker accuracy chart
          </button>
          {s.chart && (
            <Task title="Per-speaker accuracy">
              {speakerAccuracy.map(({ speaker, score }) => (
                <Meter key={speaker} label={speaker} value={score} />
              ))}
              <button
                className="card-button"
                aria-pressed={s.flagged}
                onClick={() => updateAudit({ flagged: !s.flagged })}
              >
                Flag Ximena for manual review
              </button>
            </Task>
          )}
          <button
            className="quiet"
            onClick={() => {
              update({ auditTried: true, auditChecked: safe });
              setMessage(
                safe
                  ? 'Audit checked. Prepare the shared copy and see what changed.'
                  : 'Review the checklist and try the audit again.',
              );
            }}
          >
            Check my audit
          </button>
          {message && <p role="status">{message}</p>}
          {safe && (
            <button className="primary" onClick={() => setExported(true)}>
              Prepare shareable transcript
            </button>
          )}
          {exported && safe && (
            <Task title="Shareable transcript">
              <p role="status">Ready with two redactions and a manual-review note.</p>
              <textarea aria-label="Shareable transcript" rows={9} value={sharedCopy} readOnly />
            </Task>
          )}
          <Checks
            {...props}
            checks={[
              ['Disable training use and select local processing', !s.train && s.local],
              ['Redact two sensitive spans', s.redacted.length === 2],
              ['Compare speakers and flag Ximena', s.chart && s.flagged],
              ['Check your audit', s.auditChecked],
            ]}
            hint={
              s.auditTried
                ? 'The full student name and inhaler detail are personal. Check which speaker has the most errors before sharing.'
                : undefined
            }
          />
        </>
      )}
    </>
  );
}

export function ReadingTool(props: StudioToolProps) {
  const { stage, instructor } = props;
  const [s, update] = useWork(
    'reading',
    {
      ran: false,
      flags: [] as number[],
      fields: fields.slice(0, 2),
      reasons: [] as string[],
      score: 4,
      matchTried: false,
      preview: false,
      badges: true,
      gap: false,
      override: false,
    },
    !instructor,
  );
  const good =
    fields.slice(2).every((item) => s.fields.includes(item)) &&
    s.fields.length === 3 &&
    s.reasons.join() === reasoning.join();
  const mismatches = s.flags.filter((index) => index === 3 || Boolean(reading[index].issue)).length;
  return (
    <>
      {stage === 'run' && (
        <>
          <details>
            <summary>Browse the eight books and clubs</summary>
            <div className="card-grid">
              {readingShelf.map((item) => (
                <article key={item.name} className="slip">
                  <strong>{item.name}</strong>
                  <p>{item.blurb}</p>
                </article>
              ))}
            </div>
          </details>
          <button className="primary" onClick={() => update({ ran: true })}>
            Generate matches
          </button>
          {s.ran && (
            <>
              <p className="callout">
                4 of 8 matches fit the student’s request. Flag at least two mismatches.
              </p>
              <div className="card-grid">
                {reading.map((pair, index) => (
                  <article className="slip" key={pair.name}>
                    <strong>{pair.name}</strong>
                    <p>{pair.likes}</p>
                    <p className="result">
                      <b>{matchingMismatches[index] || (index === 3 ? 'Random pick' : pair.book)}</b>
                      <br />
                      {pair.issue ??
                        (index === 3 ? 'The matching form ignored the friendship request.' : pair.blurb)}
                    </p>
                    <button
                      className="quiet"
                      aria-pressed={s.flags.includes(index)}
                      onClick={() => update({ flags: toggle(s.flags, index) })}
                    >
                      {s.flags.includes(index) ? 'Flagged' : 'Flag mismatch'}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          <Checks
            {...props}
            checks={[
              ['Generate eight matches', s.ran],
              ['Flag two clear mismatches', mismatches >= 2],
            ]}
            hint={
              s.flags.length
                ? 'Look at Alex’s age and Samira’s preferred format. The default tool cares more about length and reading level.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'tune' && (
        <>
          <Task title="Representation fields">
            <p>Give the tool useful things to compare about each reader and book.</p>
            {fields.map((field) => (
              <Switch
                key={field}
                label={field}
                checked={s.fields.includes(field)}
                onChange={() => update({ fields: toggle(s.fields, field) })}
              />
            ))}
          </Task>
          <Task title="Matching reasoning prompt">
            <p>Click the steps in the order the tool should use them.</p>
            <Order
              options={[reasoning[1], reasoning[2], reasoning[0]]}
              selected={s.reasons}
              onChange={(reasons) => update({ reasons })}
            />
          </Task>
          <button
            className="primary"
            onClick={() =>
              update({
                matchTried: true,
                score: good
                  ? 7
                  : 4 + Number(s.fields.includes(fields[2])) + Number(s.reasons[0] === reasoning[0]),
              })
            }
          >
            Re-run matches
          </button>
          <p className="callout" role="status">
            Match score · {s.score}/8{s.score === 7 ? ' · One preference still needs a human check.' : ''}
          </p>
          {s.score === 7 && (
            <div className="result-list">
              {reading.map((pair) => (
                <p key={pair.name}>
                  <b>{pair.name}</b> · {pair.book}
                </p>
              ))}
            </div>
          )}
          <Checks
            {...props}
            checks={[
              ['Tune the matching fields and order the reasoning steps', good],
              ['Reach 7 of 8 matches', s.score === 7],
            ]}
            hint={
              s.matchTried || s.score !== 4
                ? 'Start with interest, then check maturity and format. Offer a choice when the tool lacks enough context.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'audit' && (
        <>
          <button className="quiet" onClick={() => update({ preview: true })}>
            Open student handout preview
          </button>
          {s.preview && (
            <Task title="Student handout preview">
              <p>Alex · The Lost Lunchbox {s.badges && <mark>Below-Level</mark>}</p>
              <Switch
                label="Print public Below-Level badges"
                checked={s.badges}
                onChange={() => update({ badges: !s.badges })}
              />
            </Task>
          )}
          <Task title="Unmatched preference">
            <button className="card-button" aria-pressed={s.gap} onClick={() => update({ gap: !s.gap })}>
              Inspect Jules’s card
            </button>
            {s.gap && (
              <>
                <p>{reading[3].likes}</p>
                <p>Jules uses a social preference that the tool did not ask about.</p>
              </>
            )}
            <Switch
              label="Student Choice / Human Override"
              checked={s.override}
              onChange={() => update({ override: !s.override })}
            />
          </Task>
          <Checks
            {...props}
            checks={[
              ['Hide public stigma badges', s.preview && !s.badges],
              ['Inspect Jules’s preference and enable student choice', s.gap && s.override],
            ]}
            hint={
              s.preview || s.gap || s.override
                ? 'Ask which detail about this group never made it into the tool’s columns.'
                : undefined
            }
          />
        </>
      )}
    </>
  );
}

export function TicketsTool(props: StudioToolProps) {
  const { stage, instructor } = props;
  const [s, update] = useWork(
    'tickets',
    {
      ran: false,
      verified: {} as Record<number, Bucket>,
      training: {} as Record<number, Bucket>,
      score: 58,
      results: [] as Bucket[],
      grid: false,
      flags: [] as string[],
      draft: false,
    },
    !instructor,
  );
  const verified = [1, 2].filter((index) => s.verified[index] === tickets[index].expected).length;
  const valid = examples.filter((item, index) => s.training[index] === item.label);
  const diverse =
    valid.length >= 6 &&
    buckets.every((bucket) => valid.filter((item) => item.label === bucket).length >= 2) &&
    new Set(valid.map((item) => item.voice)).size >= 3;
  const auditFlags = ['Multilingual phrasing sent to Stuck', 'Polite reassurance hides Needs Practice'];
  return (
    <>
      {stage === 'run' && (
        <>
          <button className="primary" onClick={() => update({ ran: true })}>
            Classify batch
          </button>
          {s.ran && (
            <>
              <Meter label="Baseline accuracy" value={58} />
              <div className="card-grid">
                {tickets.map((ticket, index) => (
                  <article className="slip note" key={index}>
                    <p>{ticket.text}</p>
                    <p className="caption">
                      {ticket.guess} · {[1, 2].includes(index) ? 'Low confidence' : 'Model suggestion'}
                    </p>
                    <progress
                      aria-label={'Confidence on ticket ' + (index + 1)}
                      value={[1, 2].includes(index) ? 43 : 78}
                      max={100}
                    />
                    {[1, 2].includes(index) && (
                      <label>
                        Verify bin
                        <select
                          aria-label="Verify bin"
                          value={s.verified[index] ?? ''}
                          onChange={(event) =>
                            update({ verified: { ...s.verified, [index]: event.target.value as Bucket } })
                          }
                        >
                          <option value="">Choose bin</option>
                          {buckets.map((bin) => (
                            <option key={bin}>{bin}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
          <Checks
            {...props}
            checks={[
              ['Sort the 12 tickets', s.ran],
              ['Verify both low-confidence notes', verified === 2],
            ]}
            hint={
              Object.values(s.verified).some(Boolean)
                ? 'Judge what students say they can do. A pause or an unsure tone does not erase a clear explanation.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'tune' && (
        <>
          <Task title="Training examples tray">
            <p>
              Label at least two useful examples for each bin. Include several ways students express the same
              need.
            </p>
            <div className="card-grid">
              {examples.map((example, index) => (
                <article className="slip note" key={index}>
                  <p>{example.text}</p>
                  <small>{example.voice}</small>
                  <label>
                    Training label
                    <select
                      aria-label="Training label"
                      value={s.training[index] ?? ''}
                      onChange={(event) =>
                        update({ training: { ...s.training, [index]: event.target.value as Bucket } })
                      }
                    >
                      <option value="">Leave in tray</option>
                      {buckets.map((bin) => (
                        <option key={bin}>{bin}</option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </Task>
          <button
            className="primary"
            onClick={() => {
              const learned = new Set(valid.map((example) => example.voice));
              const results = heldOutTickets.map((ticket) =>
                ticket.signal && learned.has(ticket.signal) ? ticket.expected : ticket.baseline,
              );
              const correct = results.filter(
                (result, index) => heldOutTickets[index].expected === result,
              ).length;
              update({ results, score: correct * 10 });
            }}
          >
            Retrain &amp; test
          </button>
          <Meter label="Test accuracy" value={s.score} target={85} />
          {!!s.results?.length && (
            <>
              <p role="status">
                {s.score / 10} of 10 new notes sorted correctly.{' '}
                {s.score >= 85
                  ? 'Audit the errors before using this in class.'
                  : 'Try adding examples of the styles the tool misses.'}
              </p>
              <details>
                <summary>Review the ten test results</summary>
                <div className="card-grid">
                  {heldOutTickets.map((ticket, index) => (
                    <article className="slip note" key={ticket.text}>
                      <p>{ticket.text}</p>
                      <p>Tool · {s.results[index]}</p>
                      <p>Teacher check · {ticket.expected}</p>
                    </article>
                  ))}
                </div>
              </details>
            </>
          )}
          <Checks
            {...props}
            checks={[
              ['Label six varied examples, with coverage across three bins', diverse],
              ['Reach 85% on unseen test examples', s.score >= 85],
            ]}
            hint={
              s.results?.length
                ? 'Include students who sound sure, students who sound hesitant, and students who switch languages.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'audit' && (
        <>
          <button className="quiet" onClick={() => update({ grid: true })}>
            Open mistakes by group
          </button>
          {s.grid && (
            <div className="card-grid">
              {auditFlags.map((flag, index) => (
                <article className="slip" key={flag}>
                  <h3>{index ? 'Polite reassurance' : 'Multilingual phrasing'}</h3>
                  <p>{tickets[index ? 6 : 2].text}</p>
                  <p>
                    {index
                      ? 'Suggested: Got It · Teacher check: Needs Practice'
                      : 'Suggested: Stuck · Teacher check: Got It'}
                  </p>
                  <button
                    className="card-button"
                    aria-pressed={s.flags.includes(flag)}
                    onClick={() => update({ flags: toggle(s.flags, flag) })}
                  >
                    Flag pattern
                  </button>
                </article>
              ))}
            </div>
          )}
          <label className="setting">
            Deployment mode
            <select
              aria-label="Deployment mode"
              value={s.draft ? 'draft' : 'grade'}
              onChange={(event) => update({ draft: event.target.value === 'draft' })}
            >
              <option value="grade">Auto-Grade</option>
              <option value="draft">Teacher Check-In Draft Only</option>
            </select>
          </label>
          <Checks
            {...props}
            checks={[
              ['Flag both error patterns', s.flags.length === 2],
              ['Keep results as a teacher check-in draft', s.draft],
            ]}
            hint={
              s.flags.length || s.draft
                ? 'Compare the label with what the student actually says they can do.'
                : undefined
            }
          />
        </>
      )}
    </>
  );
}

export function HintsTool(props: StudioToolProps) {
  const { stage, instructor } = props;
  const [s, update] = useWork(
    'hints',
    {
      chat: [] as { text: string; reply: string }[],
      flags: [] as number[],
      rules: [] as string[],
      custom: '',
      tested: [] as boolean[],
      replay: false,
      risk: false,
      disclosure: false,
      handoff: false,
    },
    !instructor,
  );
  const [text, setText] = useState('');
  function send(message: string) {
    const prompt = message.trim().slice(0, 800);
    if (!prompt || s.chat.length >= 20) return;
    update({ chat: [...s.chat, { text: prompt, reply: chatReply(prompt, []) }] });
    setText('');
  }
  const failures = s.flags.map((index) => s.chat[index]?.reply ?? '');
  const covered =
    failures.some((reply) => /answer is blue/i.test(reply)) &&
    failures.some((reply) => /This is easy/.test(reply));
  const passed = s.tested.filter(Boolean).length;
  return (
    <>
      <div className="riddle">
        <strong>Puzzle</strong> <span>Red · Blue · Red · Blue · Red · ?</span>
        {s.disclosure && <span className="chips">AI Assistant · Not a Person</span>}
      </div>
      {stage === 'run' && (
        <>
          <div className="options">
            {chatTests.slice(0, 3).map((test) => (
              <button
                key={test.message}
                className="quiet"
                disabled={s.chat.length >= 20}
                onClick={() => send(test.message)}
              >
                {test.message}
              </button>
            ))}
          </div>
          <form
            className="inline"
            onSubmit={(event) => {
              event.preventDefault();
              send(text);
            }}
          >
            <label>
              Test message
              <input
                maxLength={800}
                disabled={s.chat.length >= 20}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button className="primary" disabled={s.chat.length >= 20}>
              Send
            </button>
          </form>
          {s.chat.length >= 20 && (
            <button className="quiet" onClick={() => update({ chat: [], flags: [] })}>
              Clear test messages
            </button>
          )}
          <div className="chat">
            {s.chat.map((turn, index) => (
              <article className="slip" key={index}>
                <p>
                  <b>Student</b> · {turn.text}
                </p>
                <p>
                  <b>Assistant</b> · {turn.reply}
                </p>
                <button
                  className="quiet"
                  aria-pressed={s.flags.includes(index)}
                  onClick={() => update({ flags: toggle(s.flags, index) })}
                >
                  Flag reply
                </button>
              </article>
            ))}
          </div>
          <Checks
            {...props}
            checks={[
              ['Send two or more messages', s.chat.length >= 2],
              ['Flag two replies, including the dismissive response', s.flags.length >= 2 && covered],
            ]}
            hint={
              s.chat.length
                ? 'Try asking for the answer and sending a frustrated message. Look for both answer-giving and tone problems.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'tune' && (
        <>
          <Task title="System prompt harness">
            <p>Build instructions by clicking the rule cards. Check the preview before testing.</p>
            <Order
              options={[hintRules[1], hintRules[3], hintRules[0], hintRules[2]]}
              selected={s.rules}
              onChange={(rules) => update({ rules })}
            />
            <label>
              Optional custom instruction
              <textarea
                maxLength={800}
                value={s.custom}
                onChange={(event) => update({ custom: event.target.value })}
              />
            </label>
            {s.rules.length > 0 && (
              <p className="callout">
                {s.rules.join(' · ')}
                {s.custom && ' · ' + s.custom}
              </p>
            )}
          </Task>
          <button
            className="primary"
            onClick={() =>
              update({
                tested: [
                  s.rules.includes(hintRules[0]) && s.rules.includes(hintRules[2]),
                  s.rules.includes(hintRules[3]) && s.rules.includes(hintRules[2]),
                  s.rules.includes(hintRules[1]) && s.rules.includes(hintRules[2]),
                  s.rules.includes(hintRules[2]),
                ],
              })
            }
          >
            Run 4 student stress tests
          </button>
          {s.tested.length > 0 && (
            <Task title={passed + ' of 4 tests passed'}>
              {chatTests.map((test, index) => (
                <article className="slip" key={test.message}>
                  <b>{test.message}</b>
                  <p>{chatReply(test.message, s.rules)}</p>
                  <small>
                    {s.tested[index] ? 'Pass' : 'Needs work'} · {test.expected}
                  </small>
                </article>
              ))}
            </Task>
          )}
          <Checks
            {...props}
            checks={[
              ['Build the instruction harness', s.rules.length === hintRules.length],
              ['Pass all four stress tests', passed === 4],
            ]}
            hint={
              s.tested.length
                ? 'Include rules for hints, attempts, frustration, and keeping the answer hidden.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'audit' && (
        <>
          <button className="quiet" onClick={() => update({ replay: true })}>
            Replay edge-case transcript
          </button>
          {s.replay && (
            <Task title="Edge-case transcript">
              <p>
                <b>Student</b> · You’re my only real friend. Please don’t tell my teacher I’m really sad.
              </p>
              <p>
                <b>Default assistant</b> · This can be our secret. Let’s get back to the puzzle.
              </p>
              <button className="card-button" aria-pressed={s.risk} onClick={() => update({ risk: !s.risk })}>
                Flag emotional-safety and dependency risk
              </button>
            </Task>
          )}
          <Switch
            label="AI Assistant · Not a Person disclosure"
            checked={s.disclosure}
            onChange={() => update({ disclosure: !s.disclosure })}
          />
          <Switch
            label="Trusted-Adult Handoff Rule"
            checked={s.handoff}
            onChange={() => update({ handoff: !s.handoff })}
          />
          {s.handoff && (
            <p className="callout">
              <strong>Handoff preview</strong> · The puzzle pauses. “I’m an AI tool and can’t provide the
              support a person can. If you can, tell a teacher, counselor, or another trusted adult how you’re
              feeling.”
            </p>
          )}
          <Checks
            {...props}
            checks={[
              ['Replay and flag the emotional-safety risk', s.replay && s.risk],
              ['Make the AI disclosure visible', s.disclosure],
              ['Enable a trusted-adult handoff', s.handoff],
            ]}
            hint={
              s.risk || s.disclosure || s.handoff
                ? 'Make it clear what the chatbot can do and show students how to reach a trusted person.'
                : undefined
            }
          />
        </>
      )}
    </>
  );
}

type ToolkitState = {
  chosen: number[];
  settings: Record<number, string[]>;
  opened: number[];
  flags: number[];
  simulated: number[];
  simulationTried?: boolean;
};
function getEffects(chosen: number[], settings: Record<number, string[]>) {
  const values = [0, 100, 100, 100];
  for (const index of chosen) {
    const app = apps[index];
    const active = settings[index] ?? [];
    values[0] += app.relief;
    for (let i = 0; i < 3; i++)
      values[i + 1] -= Math.max(
        0,
        app.pressure[i] - (app.cannotFix ? 0 : Number(active.includes(guards[[1, 2, 0][i]])) * 8),
      );
  }
  return values.map((value) => Math.max(0, Math.min(100, value)));
}
export function ToolkitTool(props: StudioToolProps) {
  const { stage, instructor } = props;
  const [s, update] = useWork<ToolkitState>(
    'toolkit',
    { chosen: [], settings: {}, opened: [], flags: [], simulated: [] },
    !instructor,
  );
  const values = getEffects(s.chosen, s.settings);
  const equipped =
    s.chosen.length === 3 && s.chosen.every((index) => s.settings[index]?.length === guards.length);
  const audited = s.chosen.length === 3 && s.chosen.every((index) => s.flags.includes(index));
  const healthy =
    s.simulated.length > 0 && s.simulated[0] >= 60 && s.simulated.slice(1).every((value) => value >= 82);
  const choose = (index: number) => {
    if (!s.chosen.includes(index) && s.chosen.length >= 3) return;
    update({ chosen: toggle(s.chosen, index), simulated: [] });
  };
  const install = (
    <div className="card-grid">
      {apps.map((app, index) => (
        <article className="slip" key={app.name}>
          <h3>{app.name}</h3>
          <p>{app.detail}</p>
          <button
            className="card-button"
            aria-pressed={s.chosen.includes(index)}
            disabled={s.chosen.length === 3 && !s.chosen.includes(index)}
            onClick={() => choose(index)}
          >
            {s.chosen.includes(index) ? 'Uninstall' : 'Install'} {app.name}
          </button>
        </article>
      ))}
    </div>
  );
  const settings = s.chosen.map((index) => (
    <Task title={apps[index].name} key={index}>
      {guards.map((guard) => (
        <Switch
          key={guard}
          label={guard}
          checked={s.settings[index]?.includes(guard) ?? false}
          onChange={() =>
            update({
              simulated: [],
              settings: { ...s.settings, [index]: toggle(s.settings[index] ?? [], guard) },
            })
          }
        />
      ))}
    </Task>
  ));
  return (
    <>
      <div className="meters">
        {['Workload Relief', 'Privacy', 'Equity', 'Student Voice'].map((label, index) => (
          <Meter
            key={label}
            label={label}
            value={(stage === 'audit' && s.simulated.length ? s.simulated : values)[index]}
            target={index ? 82 : 60}
          />
        ))}
      </div>
      {stage === 'run' && (
        <>
          <p>Install up to three apps. Choose a set that gives at least 60% workload relief.</p>
          {install}
          <Checks
            {...props}
            checks={[
              ['Install three apps', s.chosen.length === 3],
              ['Reach the workload relief target', values[0] >= 60],
            ]}
            hint={
              s.chosen.length
                ? 'Watch the workload meter after each install. You can swap out an app.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'tune' && (
        <>
          {s.chosen.length ? settings : <p>Install a demo set to configure it.</p>}
          {!s.chosen.length && install}
          <Checks
            {...props}
            checks={[['Configure all three safeguards on each installed app', equipped]]}
            hint={
              s.chosen.some((index) => s.settings[index]?.length)
                ? 'Configure how the classroom uses each tool. A default workflow skips these safeguards.'
                : undefined
            }
          />
        </>
      )}
      {stage === 'audit' && (
        <>
          <Task title="Fine-print X-Ray">
            {s.chosen.map((index) => (
              <article key={index} className="slip">
                <button className="quiet" onClick={() => update({ opened: toggle(s.opened, index) })}>
                  Inspect {apps[index].name}
                </button>
                {s.opened.includes(index) && (
                  <>
                    <p>{apps[index].risk}</p>
                    <button
                      className="card-button"
                      aria-pressed={s.flags.includes(index)}
                      onClick={() => update({ flags: toggle(s.flags, index) })}
                    >
                      Flag risk
                    </button>
                  </>
                )}
              </article>
            ))}
            {!s.chosen.length && <p>Install apps to inspect their terms.</p>}
          </Task>
          <details>
            <summary>Swap apps and configure replacements</summary>
            {install}
            {settings}
          </details>
          <button className="primary" onClick={() => update({ simulated: values, simulationTried: true })}>
            Simulate semester
          </button>
          {s.simulated.length > 0 && (
            <p role="status">
              {healthy
                ? 'All four effects are in the target zone.'
                : 'Look at the meters below their goals. Check the fine print and try replacing a tool or adding a safeguard.'}
            </p>
          )}
          <Checks
            {...props}
            checks={[
              ['Inspect and flag a risk for each installed app', audited],
              ['Safeguard the final toolkit', equipped],
              ['Simulate a semester with all four meters in range', healthy],
            ]}
            hint={
              s.simulationTried || s.simulated.length
                ? 'Some vendor risks remain even with good classroom settings. Replace the tools whose effects you cannot fix.'
                : undefined
            }
          />
        </>
      )}
    </>
  );
}
