import { Button } from 'animal-island-ui';
import { RibbonHeading } from '@/components/RibbonHeading';
import { BulbIcon, MapIcon, NotebookIcon, FileTextIcon, VolumeIcon } from 'naive-icons';
import { useEffect, useId, useRef, useState } from 'react';
import type { Access } from '@/contracts/session';
import { weekOneVersion } from '@/contracts/week-one';
import { archivedWeekOnePath } from '@/curriculum/studio-route';
import type { Quest } from '@/curriculum/types';
import { canAdvance } from '@/game/quest-state';
import { useWeekOneCheckpoint } from './useWeekOneCheckpoint';
import { WeekOneScene } from './WeekOneScene';
import { QuestTools, type Tool } from './QuestTools';
import {
  ActivityTour,
  activityInstructions,
  findGuideTarget,
  firstCaseCue,
  guideAnchors,
  type GuideCue,
} from './ActivityGuide';
import { OpeningWalkthrough } from './OpeningWalkthrough';
import { StationReview } from './StationReview';
import { ArchivedResponses } from './ArchivedResponses';
import { stationFor, type Station } from './room-content';
import { weekOneViewPosition, type ReviewPosition } from './view-position';
import { DriftBottle } from '../bottles/DriftBottle';
import './week-one.css';
import '../room/room.css';

const tools = [
  { label: 'Map', Icon: MapIcon },
  { label: 'Notebook', Icon: NotebookIcon },
  { label: 'Transcript', Icon: FileTextIcon },
] as const;

type Preview = { kind: 'walkthrough'; attempt: number } | ReviewPosition;

type PlaytestControls = {
  starting: boolean;
  message: string;
  onStart: () => void;
  onReturn?: () => void;
};

export function WeekOnePlayer({
  quest,
  access,
  signOut,
  textView,
  reconnect,
  playtest,
}: {
  quest: Quest;
  access: Access;
  signOut: () => void;
  textView: boolean;
  reconnect: () => void;
  playtest?: PlaytestControls;
}) {
  const save = useWeekOneCheckpoint(access, reconnect);
  const [tool, setTool] = useState<Tool>();
  const [sound, setSound] = useState(false);
  const [view] = useState(() => weekOneViewPosition(access.accountKey));
  const [introFinished, finishIntro] = useState(view.started);
  const [lastIntroLine, setLastIntroLine] = useState(false);
  const [guideMode, setGuideMode] = useState<'automatic' | 'open' | 'closed'>('automatic');
  const [requestedPreview, setPreview] = useState<Preview | null>(view.review);
  const { record } = save;
  const index = record?.state.index;
  const practice = record?.state.entries.opening?.inspected?.includes('practice') ?? false;
  const reviewReachable =
    requestedPreview?.kind === 'station' &&
    (requestedPreview.station === 'entrance'
      ? requestedPreview.stepIndex === 0 && (introFinished || practice || (index ?? 0) > 0)
      : index !== undefined &&
        requestedPreview.stepIndex < index &&
        stationFor(quest.steps[requestedPreview.stepIndex]) === requestedPreview.station);
  const preview = reviewReachable || requestedPreview?.kind === 'walkthrough' ? requestedPreview : null;
  const previewing = preview !== null;
  const root = useRef<HTMLDivElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const mapButton = useRef<HTMLButtonElement>(null);
  const inspectButton = useRef<HTMLButtonElement>(null);
  const draftKey = 'next-move.w01.' + weekOneVersion + '.recommendation.' + access.accountKey;
  const recordReview = useRef<HTMLHeadingElement>(null);
  const previousFresh = useRef<boolean | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const toolHeadingId = useId();
  const lastIndex = useRef<number>(undefined);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (index !== undefined && lastIndex.current !== undefined && lastIndex.current !== index) {
      setGuideMode('closed');
      if (!previewing) heading.current?.focus();
    }
    lastIndex.current = index;
  }, [index, previewing]);
  useEffect(() => {
    if (tool) dialog.current?.showModal();
    else dialog.current?.close();
  }, [tool]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (introFinished) inspectButton.current?.focus();
  }, [introFinished]);

  function playChime() {
    const context = audio.current;
    if (!context || context.state !== 'running') return;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = 'sine';
    tone.frequency.value = 523.25;
    volume.gain.setValueAtTime(0.045, context.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
    tone.connect(volume).connect(context.destination);
    tone.start();
    tone.stop(context.currentTime + 0.18);
  }

  const loaded = Boolean(record);
  const fresh = record?.state.entries.opening?.inspected?.includes('fresh') ?? false;
  useEffect(() => {
    if (!loaded) return;
    if (fresh && previousFresh.current === false && !tool && !previewing) recordReview.current?.focus();
    previousFresh.current = fresh;
  }, [fresh, loaded, tool, previewing]);
  if (!record)
    return (
      <div className={save.message ? 'panel loading load-error' : 'panel loading'}>
        <p role="status">{save.message || 'Opening your field notebook…'}</p>
        {!!save.message && (
          <div className="actions">
            <Button type="primary" className="button" onClick={save.reload}>
              Try again
            </Button>
            <Button className="button secondary" onClick={signOut}>
              Use another code
            </Button>
          </div>
        )}
      </div>
    );
  const saveState = save.busy
    ? 'saving'
    : save.pending
      ? 'retry'
      : save.message && save.message !== 'Saved'
        ? 'error'
        : record.lastSaved
          ? 'saved'
          : 'ready';
  const saveMark = { saving: '◷', retry: '!', error: '!', saved: '✓', ready: '●' }[saveState];
  const { entries, index: savedIndex } = record.state;
  const step = quest.steps[record.state.index];
  const entry = entries[step?.id] ?? {};
  const opening = step?.id === 'opening';
  const arriving = opening && !practice && !introFinished;
  const station = arriving ? 'entrance' : stationFor(step);
  const inspection =
    opening && !arriving && !fresh
      ? {
          label: practice ? 'Inspect fresh attempt' : 'Inspect practice record',
          disabled: save.locked,
          buttonRef: inspectButton,
          onPress: () => {
            if (sound) playChime();
            save.dispatch({
              type: 'inspectEvidence',
              stepId: 'opening',
              evidence: practice ? 'fresh' : 'practice',
            });
          },
        }
      : undefined;
  const bottle = quest.steps.find((item) => item.type === 'bottle');
  const readyToContinue = Boolean(step && canAdvance(step, entry));
  const guideVisible =
    !previewing && !tool && (guideMode === 'open' || (guideMode === 'automatic' && opening));
  const retryLabel = save.conflict ? 'Load latest saved work' : 'Retry save';
  let guideCue: GuideCue | undefined;
  if (save.pending && !save.busy) {
    guideCue = {
      target: guideAnchors.retry,
      title: retryLabel,
      description: save.conflict
        ? 'Open the newer saved checkpoint before continuing.'
        : 'Use this button to try saving your progress again.',
    };
  } else if (opening) {
    guideCue = firstCaseCue({ arriving, lastIntroLine, practice, fresh, readyToContinue });
  } else if (readyToContinue) {
    guideCue = {
      target: guideAnchors.continue,
      title: 'Continue',
      description: 'Move to the next step after reading the feedback.',
    };
  } else if (step?.id === 'response-lab' && entry.replay) {
    guideCue = {
      target: guideAnchors.activity,
      title: 'Compare the replies',
      description: 'Write who took the next step in each reply, then save your comparison.',
    };
  } else if (step) {
    guideCue = { target: guideAnchors.activity, title: step.title, description: activityInstructions(step) };
  }
  function pointToAction() {
    if (!guideCue) return;
    setGuideMode('open');
    const target = findGuideTarget(root.current, guideCue.target);
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const control = target?.matches('button:not(:disabled), textarea:not(:disabled)')
      ? target
      : target?.querySelector<HTMLElement>(
          'button:not(:disabled), textarea:not(:disabled), input:not(:disabled)',
        );
    control?.focus({ preventScroll: true });
  }
  function openWalkthrough() {
    view.setReview(null);
    setPreview((current) => ({
      kind: 'walkthrough',
      attempt: current?.kind === 'walkthrough' ? current.attempt + 1 : 1,
    }));
  }
  function closePreview() {
    const trigger = preview?.kind === 'station' ? mapButton : helpButton;
    view.setReview(null);
    setPreview(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  function reviewStep(stepIndex: number, location = stationFor(quest.steps[stepIndex])) {
    const position = { kind: 'station', station: location, stepIndex } as const;
    view.setStationStep(location, stepIndex);
    view.setReview(position);
    setPreview(position);
  }
  function visitStation(location: Station) {
    dialog.current?.close();
    setTool(undefined);
    if (location === station) {
      closePreview();
      return;
    }
    if (location === 'entrance') {
      reviewStep(0, location);
      return;
    }
    const remembered = view.stationStep(location);
    if (
      remembered !== undefined &&
      remembered < savedIndex &&
      stationFor(quest.steps[remembered]) === location
    ) {
      reviewStep(remembered, location);
      return;
    }
    const latest = quest.steps
      .slice(0, savedIndex)
      .reduce((previous, step, i) => (stationFor(step) === location ? i : previous), -1);
    if (latest >= 0) reviewStep(latest, location);
  }
  function startInvestigation() {
    view.setLine('opening', view.line('entrance'));
    view.start();
    finishIntro(true);
  }
  function goToSupply() {
    if (station === 'supply' && opening) {
      view.setReview(null);
      setPreview(null);
      requestAnimationFrame(() => heading.current?.focus());
    } else reviewStep(0);
  }
  const liveDialogue = arriving ? 'entrance' : step?.id;
  const review = preview?.kind === 'station' ? preview : undefined;
  const reviewDialogue =
    review?.station === 'entrance' ? 'entrance' : review && quest.steps[review.stepIndex].id;
  const reviewSteps =
    review && review.station !== 'entrance'
      ? quest.steps
          .slice(0, savedIndex)
          .flatMap((item, i) => (stationFor(item) === review.station ? [i] : []))
      : [];

  return (
    <div ref={root} className={'quest-world' + (textView ? ' text-world' : '')}>
      <header className="game-hud">
        <div className="game-hud-top">
          <a className="game-home-link" href="/">
            AI in Education
          </a>
          {playtest && (
            <div className="demo-controls">
              {playtest.onReturn && (
                <>
                  <span role="status">Demo run</span>
                  <button type="button" className="text-button" onClick={playtest.onReturn}>
                    Return to saved run
                  </button>
                </>
              )}
              <button
                type="button"
                className="text-button"
                title="Start a fresh demo run"
                disabled={playtest.starting}
                onClick={playtest.onStart}
              >
                {playtest.starting ? 'Starting demo…' : 'Start over'}
              </button>
            </div>
          )}
        </div>
        {playtest?.message && (
          <p className="quest-update" role="status">
            {playtest.message}
          </p>
        )}
        <div className="game-hud-row">
          <div className="mission-title">
            <RibbonHeading label="Week 1" compact accessibleName={'Week 1 · ' + quest.title}>
              {quest.title}
            </RibbonHeading>
          </div>
          <div className="tools">
            <button ref={helpButton} type="button" onClick={openWalkthrough}>
              <BulbIcon size={21} aria-hidden="true" />
              How this works
            </button>
            {tools.map(({ label, Icon }) => (
              <button
                type="button"
                key={label}
                ref={label === 'Map' ? mapButton : undefined}
                onClick={() => setTool(label)}
              >
                <Icon size={21} aria-hidden="true" />
                {label}
              </button>
            ))}
            {typeof AudioContext === 'function' && (
              <button
                aria-pressed={sound}
                onClick={() => {
                  if (!sound) {
                    audio.current ??= new AudioContext();
                    void audio.current.resume().catch(() => undefined);
                  }
                  setSound((value) => !value);
                }}
              >
                <VolumeIcon size={21} aria-hidden="true" />
                Sound {sound ? 'on' : 'off'}
              </button>
            )}
          </div>
          <div className="save-state" data-state={saveState} role="status">
            <span aria-hidden="true">{saveMark}</span>{' '}
            {save.message || (record.lastSaved ? 'Saved' : 'Ready')}
            {!save.busy && record.lastSaved && (!save.message || save.message === 'Saved') && (
              <time dateTime={record.lastSaved}>
                {' '}
                · {new Date(record.lastSaved).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </time>
            )}
            {!save.busy && save.pending && (
              <button data-guide-anchor="save-retry" onClick={save.conflict ? save.reload : save.retry}>
                {retryLabel}
              </button>
            )}
          </div>
        </div>
      </header>
      {!previewing && !record.revision && Boolean(record.archivedVersions?.length) && (
        <p className="quest-update">
          Week 1 has a new story.{' '}
          <button type="button" className="text-button" onClick={() => setTool('Notebook')}>
            Read earlier responses in your Notebook
          </button>
          .
        </p>
      )}
      {preview?.kind === 'walkthrough' && (
        <OpeningWalkthrough
          key={preview.attempt}
          step={quest.steps[0]}
          textView={textView}
          onExit={closePreview}
        />
      )}
      {review && reviewDialogue && (
        <StationReview
          key={review.station + ':' + review.stepIndex}
          quest={quest}
          access={access}
          station={review.station}
          stepIndex={review.stepIndex}
          visitedSteps={reviewSteps}
          record={record}
          textView={textView}
          locked={save.locked}
          send={save.dispatch}
          initialLine={view.line(reviewDialogue)}
          onLineChange={(line) => view.setLine(reviewDialogue, line)}
          onExit={closePreview}
          onGoToSupply={goToSupply}
          onSelectStep={reviewStep}
          onContinue={() =>
            review.stepIndex + 1 < record.state.index ? reviewStep(review.stepIndex + 1) : closePreview()
          }
        />
      )}
      <div className="quest-session" hidden={previewing}>
        <WeekOneScene
          quest={quest}
          record={record}
          access={access}
          station={station}
          textView={textView}
          disabled={save.locked}
          draftKey={draftKey}
          headingRef={heading}
          recordsRef={recordReview}
          inspection={inspection}
          onInspectStart={arriving ? startInvestigation : undefined}
          initialLine={liveDialogue ? view.line(liveDialogue) : undefined}
          onLineChange={liveDialogue ? (line) => view.setLine(liveDialogue, line) : undefined}
          onLastIntroLine={setLastIntroLine}
          onShowGuide={pointToAction}
          send={save.dispatch}
          onAdvance={step ? () => save.dispatch({ type: 'advance', stepId: step.id }) : undefined}
          onOpenNotebook={() => setTool('Notebook')}
        />
        {bottle && record.state.index > quest.steps.indexOf(bottle) && (
          <details className="return-bottle">
            <summary>Reopen the Drift Bottle shelf</summary>
            <DriftBottle
              token={access.token}
              id="w01"
              fallback={bottle.feedback ?? ''}
              entry={entries[bottle.id] ?? {}}
              onEntry={() => undefined}
              disabled={save.locked}
            />
          </details>
        )}
      </div>
      <footer className="game-footer">
        <span>{access.label}</span>
        {!playtest?.onReturn && <button onClick={signOut}>Sign out</button>}
        <a href={archivedWeekOnePath + (textView ? '?view=text' : '')} target="_blank" rel="noopener">
          Open in a new tab
        </a>
        <a href="/activities/w01.html">Printable activity</a>
        <a href="/activities/w01.html#references" target="_blank" rel="noopener">
          Week 1 references
        </a>
      </footer>
      {guideVisible && guideCue && (
        <ActivityTour
          root={root}
          cue={guideCue}
          onDismiss={() => {
            setGuideMode('closed');
            requestAnimationFrame(() => {
              if (document.activeElement === document.body)
                helpButton.current?.focus({ preventScroll: true });
            });
          }}
        />
      )}
      <dialog
        className="tool-dialog"
        data-tool={tool}
        ref={dialog}
        aria-labelledby={toolHeadingId}
        onClose={() => setTool(undefined)}
      >
        <header>
          <h2 id={toolHeadingId}>{tool}</h2>
          <button onClick={() => dialog.current?.close()}>Close</button>
        </header>
        {tool && (
          <QuestTools
            tool={tool}
            record={record}
            quest={quest}
            station={review?.station ?? station}
            savedStation={station}
            previewing={previewing}
            onVisit={visitStation}
          />
        )}
        {tool === 'Notebook' && Boolean(record.archivedVersions?.length) && (
          <ArchivedResponses versions={record.archivedVersions ?? []} token={access.token} />
        )}
      </dialog>
    </div>
  );
}
