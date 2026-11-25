import { Button } from 'animal-island-ui';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Access } from '@/contracts/session';
import type { WeekTwoProgress, WeekTwoFutureProposal } from '@/contracts/week-two';
import {
  weekTwoDriftBottle,
  weekTwoFuture,
  weekTwoLesson,
  weekTwoMilestones,
  weekTwoQuickCheck,
  weekTwoReplay,
  type WeekTwoMilestone,
  type WeekTwoMilestoneId,
  type WeekTwoOption,
} from '@/curriculum/week-02/lesson';
import { weekTwoReferences } from '@/curriculum/week-02/references';
import { useI18n } from '@/lib/i18n/I18n';
import { QuestMasthead } from '@/components/QuestMasthead';
import { WeekTwoIntro } from '@/components/WeekTwoIntro';
import { clearTabDraft, useTabDraft } from '@/components/TextEntry';
import { DriftBottle } from '../bottles/DriftBottle';
import { YearTimeline } from './YearTimeline';
import { MilestoneArtifact } from './MilestoneArtifact';
import { useWeekTwoCheckpoint } from './useWeekTwoCheckpoint';
import './week-two.css';

type Destination = WeekTwoMilestoneId | 'intro' | 'replay' | 'future' | 'quick-check';

type ChoiceState = { selected?: string; tried?: string; hintOpen: boolean };
const emptyChoice: ChoiceState = { hintOpen: false };

function nextStop(state: WeekTwoProgress): Destination {
  if (!state.introComplete) return 'intro';
  return (
    weekTwoMilestones.find((stop) => !state.completedMilestones.includes(stop.id))?.id ??
    (state.replayComplete ? 'future' : 'replay')
  );
}

function ChoiceActivity({
  prompt,
  options,
  hint,
  value,
  onChange,
  onAttempt,
  disabled = false,
  submitLabel = 'Try this move',
  feedbackLabel,
  children,
}: {
  prompt: string;
  options: readonly WeekTwoOption[];
  hint?: string;
  value: ChoiceState;
  onChange: (value: ChoiceState) => void;
  onAttempt: (choiceId: string) => void;
  disabled?: boolean;
  submitLabel?: string;
  feedbackLabel?: string;
  children?: ReactNode;
}) {
  const choiceName = useId();
  const answer = options.find((option) => option.id === value.tried);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.selected && !disabled) onAttempt(value.selected);
  }
  return (
    <>
      <form className="w02-form" onSubmit={submit}>
        <fieldset disabled={disabled}>
          <legend>{prompt}</legend>
          <div className="w02-options">
            {options.map((option) => (
              <label className="w02-option" key={option.id}>
                <input
                  type="radio"
                  name={choiceName}
                  value={option.id}
                  checked={value.selected === option.id}
                  onChange={() => onChange({ ...value, selected: option.id })}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="w02-actions">
          <Button type="primary" className="button" htmlType="submit" disabled={disabled || !value.selected}>
            {answer ? 'Try again' : submitLabel}
          </Button>
          {answer && hint && (
            <button
              className="button secondary"
              type="button"
              aria-expanded={value.hintOpen}
              onClick={() => onChange({ ...value, hintOpen: !value.hintOpen })}
            >
              {value.hintOpen ? 'Hide hint' : 'Show hint'}
            </button>
          )}
        </div>
      </form>
      {answer && (
        <div className="w02-feedback" role="status">
          <strong>{feedbackLabel ?? (answer.best ? 'Best choice' : 'A better choice is available')}</strong>
          <p>{answer.feedback}</p>
        </div>
      )}
      {value.hintOpen && hint && <p className="w02-hint">{hint}</p>}
      {children}
    </>
  );
}

function ArchiveIllustration({ year, animate }: { year: WeekTwoMilestoneId; animate: boolean }) {
  if (year === '1980')
    return (
      <figure className="w02-illustration" data-animate={animate}>
        <div className="w02-turtle-grid" aria-hidden="true">
          <div className="w02-turtle-forward" />
          <div className="w02-turtle-right" />
          <div className="w02-turtle-left" />
          <div className="w02-turtle-marker" />
        </div>
        <figcaption>
          The first move goes right. A right turn traces down (dashed). A left turn traces up (solid).
        </figcaption>
      </figure>
    );
  return null;
}

function BettyPrediction({ evidence }: { evidence: { title: string; body: string } }) {
  const [asked, setAsked] = useState(false);
  return (
    <div className="w02-prediction">
      <button
        className="button secondary"
        type="button"
        aria-expanded={asked}
        onClick={() => setAsked(!asked)}
      >
        {asked ? 'Hide Betty’s prediction' : 'Ask Betty what happens to the fish'}
      </button>
      {asked && (
        <div className="w02-evidence" role="status">
          <strong>{evidence.title}</strong>
          <p>{evidence.body}</p>
        </div>
      )}
    </div>
  );
}

function MilestoneReveal({ stop, animate }: { stop: WeekTwoMilestone; animate: boolean }) {
  const references = weekTwoReferences.filter((reference) => stop.sourceIds.includes(reference.id));
  return (
    <div className="w02-reveal" data-animate={animate}>
      <h3>{stop.title}</h3>
      <MilestoneArtifact year={stop.id} animate={animate} />
      <p>{stop.summary}</p>
      <ArchiveIllustration year={stop.id} animate={animate} />
      <p>{stop.reveal}</p>
      {stop.revealPanels && (
        <div className="w02-evidence-grid">
          {stop.revealPanels.map((panel) => (
            <section className="w02-evidence" key={panel.title}>
              <h4>{panel.title}</h4>
              <p>{panel.body}</p>
            </section>
          ))}
        </div>
      )}
      <details className="w02-sources">
        <summary>Sources for {stop.year}</summary>
        <ul>
          {references.map((reference) => (
            <li key={reference.id}>
              <p>{reference.citation}</p>
              <p>{reference.locator}</p>
              <div className="w02-source-links">
                {reference.links.map((link) => (
                  <a href={link.url} key={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function FutureActivity({
  state,
  draftKey,
  locked,
  proposalTitle,
  continueToCheck,
  onSubmit,
}: {
  state: WeekTwoProgress;
  draftKey?: string;
  locked: boolean;
  proposalTitle: string;
  continueToCheck: () => void;
  onSubmit: (proposal: WeekTwoFutureProposal) => void;
}) {
  const [proposal, setProposal] = useState<WeekTwoFutureProposal>(
    state.futureProposal ?? { conceptId: '', humanDecisionId: '', evidenceId: '', rationale: '' },
  );
  const [rationale, setRationale] = useTabDraft(draftKey, state.futureProposal?.rationale ?? '');
  const fields = [
    { name: 'conceptId', label: 'An idea from the timeline', choices: weekTwoFuture.concepts },
    { name: 'humanDecisionId', label: 'A decision a person keeps', choices: weekTwoFuture.humanDecisions },
    { name: 'evidenceId', label: 'A way to check for learning', choices: weekTwoFuture.evidence },
  ] as const;
  const recorded = state.futureProposal;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !locked &&
      !recorded &&
      proposal.conceptId &&
      proposal.humanDecisionId &&
      proposal.evidenceId &&
      rationale.trim()
    )
      onSubmit({ ...proposal, rationale: rationale.trim() });
  }

  return (
    <>
      <p>{weekTwoFuture.setup}</p>
      <p>{weekTwoFuture.prompt}</p>
      {recorded ? (
        <div className="w02-feedback w02-future-reveal" role="status">
          <div className="w02-future-horizon" aria-hidden="true">
            <span />
          </div>
          <strong>{proposalTitle}</strong>
          <p>{weekTwoFuture.feedback}</p>
          <dl className="w02-proposal">
            {fields.map((field) => (
              <div key={field.name}>
                <dt>{field.label}</dt>
                <dd>{field.choices.find((choice) => choice.id === recorded[field.name])?.label}</dd>
              </div>
            ))}
            <div>
              <dt>Your tutoring plan</dt>
              <dd className="w02-saved-rationale">{recorded.rationale}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <form className="w02-form w02-future-form" onSubmit={submit}>
          {fields.map((field) => (
            <label key={field.name}>
              {field.label}
              <select
                value={proposal[field.name]}
                onChange={(event) => setProposal({ ...proposal, [field.name]: event.target.value })}
                required
                disabled={locked}
              >
                <option value="">Choose one</option>
                {field.choices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            Explain your tutoring plan
            <span className="w02-rationale-prompt">{weekTwoFuture.rationalePrompt}</span>
            <textarea
              value={rationale}
              rows={4}
              maxLength={weekTwoFuture.rationaleMaxLength}
              placeholder={weekTwoFuture.placeholder}
              required
              disabled={locked}
              onChange={(event) => setRationale(event.target.value)}
            />
          </label>
          <Button
            type="primary"
            className="button"
            htmlType="submit"
            disabled={
              locked ||
              !proposal.conceptId ||
              !proposal.humanDecisionId ||
              !proposal.evidenceId ||
              !rationale.trim()
            }
          >
            Save my proposal
          </Button>
        </form>
      )}
      <details className="w02-sources">
        <summary>Review the proposal criteria</summary>
        <ul>
          {weekTwoFuture.criteria.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ul>
      </details>
      {state.futureComplete && (
        <>
          <section className="w02-evidence">
            <h3>{weekTwoLesson.assignment.title}</h3>
            <p>Due {weekTwoLesson.assignment.due}.</p>
            <p>{weekTwoLesson.assignment.instructions}</p>
          </section>
          <div className="w02-actions">
            <Button type="primary" className="button" onClick={continueToCheck}>
              Optional check
            </Button>
          </div>
        </>
      )}
    </>
  );
}

type WeekTwoPlayerProps = { textView: boolean; mastheadTools?: ReactNode } & (
  | { localPreview: true; access?: never; signOut?: never; reconnect?: never; preview?: never }
  | { localPreview?: false; access: Access; signOut: () => void; reconnect: () => void; preview?: boolean }
);

export function WeekTwoPlayer(props: WeekTwoPlayerProps) {
  const { t, href } = useI18n();
  const [localDemo, setLocalDemo] = useState(false);
  const [destination, setDestination] = useState<Destination | undefined>('intro');
  const [resetVersion, setResetVersion] = useState(0);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const resetTrigger = useRef<HTMLButtonElement>(null);
  const resetTitle = useId();
  const {
    access,
    reconnect,
    signOut,
    textView,
    mastheadTools,
    localPreview = false,
    preview = false,
  } = props;
  const save = useWeekTwoCheckpoint({ access, reconnect, preview, localPreview });
  const demo = localDemo || preview;
  function resetProgress() {
    if (!localDemo) {
      save.reset();
      if (localPreview) clearTabDraft('next-move.w02.local-rationale');
      setDestination('intro');
    }
    setResetVersion((version) => version + 1);
    resetDialog.current?.close();
  }
  const tools = (
    <>
      {mastheadTools}
      {(localPreview || preview) && (
        <button
          ref={resetTrigger}
          className="text"
          type="button"
          disabled={!localDemo && save.locked}
          onClick={() => resetDialog.current?.showModal()}
        >
          {t(demo ? 'resetPreview' : 'resetProgress')}
        </button>
      )}
      {localPreview && (
        <label>
          <input
            type="checkbox"
            checked={localDemo}
            onChange={(event) => setLocalDemo(event.target.checked)}
          />
          {t('instructorMode')}
        </label>
      )}
      {preview && (
        <a className="text" href={href('/instructor')}>
          {t('returnToInstructor')}
        </a>
      )}
      {signOut && (
        <button className="text" type="button" onClick={signOut}>
          {t('signOut')}
        </button>
      )}
    </>
  );
  return (
    <div className="w02-player" data-text-view={textView}>
      <QuestMasthead week={2} title={<span lang="en">{weekTwoLesson.title}</span>} tools={tools} />
      {localDemo ? (
        <LocalDemoArchive key={resetVersion} textView={textView} />
      ) : (
        <Archive
          key={resetVersion}
          destination={destination}
          setDestination={setDestination}
          save={save}
          textView={textView}
          demo={preview}
          localPreview={localPreview}
          account={preview ? undefined : access}
          signOut={signOut}
        />
      )}
      {(localPreview || preview) && (
        <dialog
          className="w02-reset-dialog"
          ref={resetDialog}
          aria-labelledby={resetTitle}
          onClose={() => resetTrigger.current?.focus()}
        >
          <h2 id={resetTitle}>{t(demo ? 'resetPreviewQuestion' : 'resetWeekTwoQuestion')}</h2>
          <p>{t(demo ? 'resetPreviewNote' : 'resetWeekTwoNote')}</p>
          <div className="w02-actions">
            <button className="button secondary" type="button" onClick={() => resetDialog.current?.close()}>
              {t('cancel')}
            </button>
            <button className="button" type="button" onClick={resetProgress}>
              {t(demo ? 'resetPreview' : 'resetProgress')}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}

function LocalDemoArchive({ textView }: { textView: boolean }) {
  const save = useWeekTwoCheckpoint({ preview: true, localPreview: false });
  const [destination, setDestination] = useState<Destination | undefined>('intro');
  return (
    <Archive save={save} textView={textView} destination={destination} setDestination={setDestination} demo />
  );
}

function Archive({
  save,
  destination,
  setDestination,
  textView,
  demo,
  localPreview = false,
  account,
  signOut,
}: {
  save: ReturnType<typeof useWeekTwoCheckpoint>;
  destination: Destination | undefined;
  setDestination: (destination: Destination | undefined) => void;
  textView: boolean;
  demo: boolean;
  localPreview?: boolean;
  account?: Access;
  signOut?: () => void;
}) {
  const { t, locale } = useI18n();
  const [choices, setChoices] = useState<Partial<Record<Destination, ChoiceState>>>({});
  const [unlocked, setUnlocked] = useState<WeekTwoMilestoneId>();
  const [revealed, setRevealed] = useState<ReadonlySet<WeekTwoMilestoneId>>(() => new Set());
  const [showQuickCheck, setShowQuickCheck] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const lastDestination = useRef<Destination | undefined>(undefined);
  const stageArea = useRef<HTMLDivElement>(null);
  const fromStageTab = useRef(false);
  const { record } = save;
  const state = record?.state;
  const next = state && nextStop(state);
  const destinationReachable =
    demo ||
    destination === 'intro' ||
    destination === next ||
    (destination === 'replay' && state?.replayComplete) ||
    (destination === 'future' && state?.replayComplete) ||
    (destination === 'quick-check' && state?.futureComplete) ||
    state?.completedMilestones.some((id) => id === destination);
  const active = destinationReachable ? (destination ?? next) : next;

  useEffect(() => {
    const previous = lastDestination.current;
    if (active && previous && previous !== active) {
      if (!fromStageTab.current) {
        heading.current?.focus({ preventScroll: true });
        if (previous === 'intro' && stageArea.current && stageArea.current.getBoundingClientRect().top < 0) {
          stageArea.current.scrollIntoView({ block: 'start' });
        } else if (previous !== 'intro') {
          heading.current?.scrollIntoView({ block: 'nearest' });
        }
      }
      fromStageTab.current = false;
    }
    lastDestination.current = active;
  }, [active]);

  if (!record || !state || !next || !active) {
    return (
      <section className="panel loading w02-loading" aria-label="Lesson status" lang="en">
        <p role="status">{save.message || 'Opening Week 2…'}</p>
        {save.message && (
          <div className="w02-actions">
            <Button type="primary" className="button" onClick={save.reload}>
              Try again
            </Button>
            {account && (
              <button type="button" className="button secondary" onClick={signOut}>
                Use another code
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  const stop = weekTwoMilestones.find((item) => item.id === active);
  const visible = stop && (revealed.has(stop.id) || state.completedMilestones.includes(stop.id));
  const recordedYear = stop && state.completedMilestones.includes(stop.id);
  const choice = choices[active] ?? emptyChoice;
  const stage =
    active === 'intro' ? 'I Do' : active === 'future' || active === 'quick-check' ? 'You Do' : 'We Do';
  const guidedStop =
    weekTwoMilestones.find((item) => !state.completedMilestones.includes(item.id))?.id ?? 'replay';
  function open(destination: Destination, source: 'stage' | 'activity' = 'activity') {
    fromStageTab.current = source === 'stage' && destination !== active;
    setUnlocked(undefined);
    setDestination(destination);
    if (source === 'activity' && destination === active) heading.current?.focus();
  }
  function choose(value: ChoiceState) {
    if (active) setChoices((current) => ({ ...current, [active]: value }));
  }
  function submitMilestone(choiceId: string) {
    if (!stop || save.locked) return;
    setDestination(stop.id);
    choose({ ...choice, tried: choiceId });
    if (!visible) {
      setRevealed((current) => new Set([...current, stop.id]));
      setUnlocked(stop.id);
    }
    if (!recordedYear) save.dispatch({ type: 'completeMilestone', milestoneId: stop.id, choiceId });
  }
  function goForward() {
    const index = weekTwoMilestones.findIndex((item) => item.id === active);
    open(weekTwoMilestones[index + 1]?.id ?? 'replay');
  }

  return (
    <>
      {(!localPreview || save.message) && (
        <div className="w02-save" lang={demo ? undefined : 'en'}>
          <p role="status">
            {demo ? (
              <>
                <strong>{t('instructorPreview')}</strong> · {t('archiveDemoNote')}
              </>
            ) : save.busy ? (
              'Saving…'
            ) : (
              save.message || (record.lastSaved ? 'Saved' : 'Progress saves as you go')
            )}
          </p>
          {save.pending && !save.busy && (
            <button
              type="button"
              className="button w02-retry"
              onClick={save.conflict ? save.reload : save.retry}
            >
              {save.conflict ? 'Load latest saved work' : 'Retry save'}
            </button>
          )}
        </div>
      )}
      <div className="w02-layout" ref={stageArea} lang="en">
        <nav className="w02-stages" aria-label="Lesson stages" lang="en">
          <button
            type="button"
            aria-current={stage === 'I Do' ? 'step' : undefined}
            onClick={() => open('intro', 'stage')}
          >
            I Do <span>{weekTwoLesson.stageMinutes['I Do']} min</span>
          </button>
          <button
            type="button"
            aria-current={stage === 'We Do' ? 'step' : undefined}
            disabled={!demo && !state.introComplete}
            onClick={() => open(guidedStop, 'stage')}
          >
            We Do <span>{weekTwoLesson.stageMinutes['We Do']} min</span>
          </button>
          <button
            type="button"
            aria-current={stage === 'You Do' ? 'step' : undefined}
            disabled={!demo && !state.replayComplete}
            onClick={() => open('future', 'stage')}
          >
            You Do <span>{weekTwoLesson.stageMinutes['You Do']} min</span>
          </button>
        </nav>
        <section className="w02-activity" aria-labelledby="w02-activity-heading">
          {active !== 'intro' && (
            <YearTimeline
              demo={demo}
              state={state}
              active={active === 'quick-check' ? 'future' : active}
              next={next}
              revealed={revealed}
              unlocked={unlocked}
              onOpen={open}
              textOnly={textView}
            />
          )}
          <div className="w02-workbench">
            {active !== 'intro' && (
              <h2 ref={heading} tabIndex={-1} id="w02-activity-heading">
                {stop
                  ? stop.year
                  : active === 'replay'
                    ? weekTwoReplay.title
                    : active === 'future'
                      ? weekTwoFuture.title
                      : 'Optional check'}
              </h2>
            )}
            {stage === 'We Do' && (
              <details className="w02-instructions" key={active} open={stop?.id === '1958' && !visible}>
                <summary>How this works</summary>
                <p>{weekTwoLesson.onboarding}</p>
              </details>
            )}
            {active === 'intro' && (
              <WeekTwoIntro
                stageHeading={{ id: 'w02-activity-heading', ref: heading }}
                textOnly={textView}
                action={
                  <Button
                    type="primary"
                    className="button"
                    disabled={save.locked}
                    lang={locale}
                    onClick={() => {
                      if (state.introComplete) open(next);
                      else {
                        setDestination(undefined);
                        save.dispatch({ type: 'completeIntro' });
                      }
                    }}
                  >
                    {next === 'intro'
                      ? t('archiveOpen')
                      : next === 'replay'
                        ? t('archiveResumeComparison')
                        : next === 'future'
                          ? t(state.futureComplete ? 'archiveReviewProposal' : 'archiveResumeProposal')
                          : t('archiveResumeYear', { year: next })}
                  </Button>
                }
              />
            )}
            {stop && (
              <>
                <p className="w02-evidence">{stop.setup}</p>
                {stop.previewEvidence && <BettyPrediction evidence={stop.previewEvidence} />}
                <ChoiceActivity
                  prompt={stop.prompt}
                  options={stop.options}
                  hint={stop.hint}
                  feedbackLabel={stop.id === '2025' ? 'Study result' : undefined}
                  value={choice}
                  onChange={choose}
                  onAttempt={submitMilestone}
                  disabled={save.locked}
                >
                  {visible && <MilestoneReveal key={stop.id} stop={stop} animate={unlocked === stop.id} />}
                </ChoiceActivity>
                {recordedYear && (
                  <div className="w02-actions">
                    <Button type="primary" className="button" onClick={goForward} disabled={save.locked}>
                      {stop.id === weekTwoMilestones.at(-1)?.id
                        ? 'Compare the three replies'
                        : 'Continue to the next year'}
                    </Button>
                  </div>
                )}
              </>
            )}
            {active === 'replay' && (
              <>
                <p>{weekTwoReplay.setup}</p>
                <div className="w02-replay-grid">
                  {weekTwoReplay.cards.map((card) => (
                    <section className="w02-evidence" key={card.id}>
                      <h3>{card.title}</h3>
                      <dl className="w02-proposal">
                        <div>
                          <dt>What it observes</dt>
                          <dd>{card.observes}</dd>
                        </div>
                        <div>
                          <dt>What it says</dt>
                          <dd>{card.reply}</dd>
                        </div>
                        <div>
                          <dt>What it does next</dt>
                          <dd>{card.whatNext}</dd>
                        </div>
                        <div>
                          <dt>What it can’t tell</dt>
                          <dd>{card.limit}</dd>
                        </div>
                      </dl>
                    </section>
                  ))}
                </div>
                <ChoiceActivity
                  prompt={weekTwoReplay.prompt}
                  options={weekTwoReplay.options}
                  hint={weekTwoReplay.hint}
                  value={choice}
                  onChange={choose}
                  onAttempt={(choiceId) => {
                    choose({ ...choice, tried: choiceId });
                    if (!state.replayComplete) save.dispatch({ type: 'completeReplay', choiceId });
                  }}
                  disabled={save.locked}
                />
                {state.replayComplete && (
                  <>
                    <details className="w02-sources">
                      <summary>{weekTwoDriftBottle.title}</summary>
                      <p>{weekTwoDriftBottle.setup}</p>
                      <p>{weekTwoDriftBottle.prompt}</p>
                      <p>{weekTwoDriftBottle.replyPrompt}</p>
                      {account ? (
                        <DriftBottle
                          token={account.token}
                          id="w02"
                          includeReflection={false}
                          disabled={false}
                          fallback={weekTwoDriftBottle.example}
                          draftKey={`next-move.w02.replay.${account.accountKey}`}
                        />
                      ) : (
                        <blockquote>{weekTwoDriftBottle.example}</blockquote>
                      )}
                    </details>
                    <div className="w02-actions">
                      <Button type="primary" className="button" onClick={() => open('future')}>
                        Open the final stop
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
            {active === 'future' && (
              <FutureActivity
                state={state}
                draftKey={
                  account
                    ? `next-move.w02.rationale.${account.accountKey}`
                    : localPreview
                      ? 'next-move.w02.local-rationale'
                      : undefined
                }
                locked={save.locked}
                proposalTitle={
                  demo
                    ? 'Your preview proposal'
                    : localPreview && !record.lastSaved
                      ? 'Your proposal for this session'
                      : 'Your proposal is saved'
                }
                onSubmit={(proposal) => save.dispatch({ type: 'completeFuture', ...proposal })}
                continueToCheck={() => {
                  setShowQuickCheck(true);
                  open('quick-check');
                }}
              />
            )}
            {active === 'quick-check' && (
              <>
                {showQuickCheck ? (
                  <>
                    <ChoiceActivity
                      prompt={weekTwoQuickCheck.prompt}
                      options={weekTwoQuickCheck.options}
                      value={choice}
                      onChange={choose}
                      onAttempt={(choiceId) => choose({ ...choice, tried: choiceId })}
                      submitLabel="Check my answer"
                    />
                    <div className="w02-actions">
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setShowQuickCheck(false);
                          heading.current?.focus();
                        }}
                      >
                        {choice.tried ? 'Finish Week 2' : 'Skip check'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w02-feedback" role="status">
                    <strong>Week 2 complete</strong>
                    <p>{weekTwoLesson.assignment.instructions}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
