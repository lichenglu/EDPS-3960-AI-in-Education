import { useI18n } from '@/lib/i18n/I18n';
import { missionContent } from '@/curriculum/week-01/locales';
import { courseTopic } from '@/curriculum/locales';
import { QuestFooter } from '@/components/QuestFooter';
import { QuestMasthead } from '@/components/QuestMasthead';
import type { Access } from '@/contracts/session';
import type { StudioCheckpoint, StudioState } from '@/contracts/studio';
import { weekOneStudioPath } from '@/curriculum/studio-route';
import { questPrintPath } from '@/curriculum/print-route';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  GridIcon,
  LockIcon,
  MessageCircleIcon,
  MicIcon,
  StickyNoteIcon,
} from 'naive-icons';
import { missions } from '@/curriculum/week-01/cases';
import { previousStudioMission } from '@/curriculum/week-01/manifest';
import { studioReferences } from '@/curriculum/week-01/references';
import {
  studioMissionIds as missionIds,
  type StudioMission as MissionId,
  type StudioPhase as Stage,
} from '@/contracts/studio';
import { load, roles, storagePrefix, store } from './tools';
import { openingScenes } from '@/curriculum/week-01/story';
import { BigIdeasIntro, DeskIntroduction, OpeningStory, WelcomeGuide } from './opening';
import {
  finishedGuidedPractice,
  migrateSoundLesson,
  newSoundLesson,
  type LegacySoundLesson,
  type SoundLesson,
} from './sound-desk-data';
import { resumeLesson, WeekOneLesson, type LessonProgress } from './week-one-lesson';
import { desks, guest, type CastId } from './studio-layout';
import { StudioWork, useStudioSave } from './studio-progress';
import { useStudioSound } from './studio-sound';
import { stages } from './tool-tabs';
import { ClassroomWorld } from './world';
import './studio.css';

const perspectives = { run: 'userRole', tune: 'developerRole', audit: 'criticRole' } as const;
const missionIcons = {
  transcript: MicIcon,
  reading: BookOpenIcon,
  tickets: StickyNoteIcon,
  hints: MessageCircleIcon,
  toolkit: GridIcon,
};
function MissionIcon({ id }: { id: MissionId }) {
  const Icon = missionIcons[id];
  return (
    <span className="mission-icon" aria-hidden>
      <Icon size={27} />
    </span>
  );
}

const soundLessonKey = 'lesson.transcript.v2';
const stationLessonsKey = 'lesson.week-one';
type Progress = Partial<Record<MissionId, Stage[]>>;
type StationLessons = Partial<Record<Exclude<MissionId, 'transcript'>, LessonProgress>>;
type Screen = 'room' | 'hub' | 'tool';
type Arrival = 'ideas' | 'story' | 'controls' | 'done';
type MissionOffer = { id: MissionId; fromHub: boolean };

function Stars({ earned }: { earned: Stage[] }) {
  const { t } = useI18n();
  return (
    <span
      className="stars"
      aria-label={stages
        .map((stage) =>
          t(earned.includes(stage) ? 'starEarned' : 'starPending', { role: t(perspectives[stage]) }),
        )
        .join(', ')}
    >
      {stages.map((stage) => (
        <span key={stage} aria-hidden className={stage + (earned.includes(stage) ? ' earned' : '')}>
          ★
        </span>
      ))}
    </span>
  );
}
function Hub({
  progress,
  hasStarted,
  unlocked,
  open,
}: {
  progress: Progress;
  hasStarted: (id: MissionId) => boolean;
  unlocked: (id: MissionId) => boolean;
  open: (id: MissionId) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <section className="paper hub" aria-labelledby="hub-title">
      <div className="hub-heading">
        <div>
          <h2 id="hub-title" className="studio-section-title">
            {t('missionHub')}
          </h2>
          <p>{t('missionHubIntro')}</p>
        </div>
        <div className="balance" aria-label={t('balanceMeter')}>
          <b>{t('perspectiveBalance')}</b>
          {stages.map((stage) => {
            const current = missionIds.filter((id) => progress[id]?.includes(stage)).length;
            return (
              <div key={stage} className={stage}>
                <span>{t(perspectives[stage])}</span>
                <progress
                  aria-label={t('starCount', { role: t(perspectives[stage]) })}
                  max={5}
                  value={current}
                />
                <span>{current}/5</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="hub-grid">
        {missionIds.map((id, index) => {
          const mission = missionContent(id, locale);
          const earned = progress[id] ?? [];
          return (
            <article
              className="mission-card"
              key={id}
              style={{ '--station': mission.color } as CSSProperties}
            >
              <MissionIcon id={id} />
              <div>
                <strong>{mission.idea}</strong>
                <h2>{mission.name}</h2>
                <p>{mission.task}</p>
              </div>
              <Stars earned={earned} />
              <button className="quiet" disabled={!unlocked(id)} onClick={() => open(id)}>
                {unlocked(id)
                  ? hasStarted(id)
                    ? t('openMission')
                    : t('startMission')
                  : t('unlockAfter', { idea: missionContent(missionIds[index - 1], locale).idea })}
                <span className="sr"> · {mission.idea}</span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Room({
  hasStarted,
  current,
  unlocked,
  arrival,
  setArrival,
  pending,
  offer,
  dismiss,
  confirm,
  mute,
  playLockedCue,
  storyIndex,
  setStoryIndex,
}: {
  hasStarted: (id: MissionId) => boolean;
  current: number;
  unlocked: (id: MissionId) => boolean;
  arrival: Arrival;
  setArrival: (next: Arrival) => void;
  pending: MissionOffer | undefined;
  offer: (id: MissionId) => void;
  dismiss: () => void;
  confirm: (id: MissionId) => void;
  mute: boolean;
  playLockedCue: () => void;
  storyIndex: number;
  setStoryIndex: (index: number) => void;
}) {
  const { t, locale } = useI18n();
  const [denial, setDenial] = useState<{ id: MissionId; attempt: number }>();
  const [meetingGuest, setMeetingGuest] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const story = arrival === 'story' && !pending;
  const controls = arrival === 'controls';
  useEffect(() => {
    if (!denial) return;
    const timer = window.setTimeout(() => setDenial(undefined), 4000);
    return () => window.clearTimeout(timer);
  }, [denial]);
  function rememberFocus() {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  function restoreFocus() {
    if (controls) return;
    requestAnimationFrame(() => {
      if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
      else document.getElementById('room-title')?.focus({ preventScroll: true });
    });
  }
  function contact(id: MissionId) {
    if (!unlocked(id)) {
      setDenial((previous) => ({ id, attempt: (previous?.attempt ?? 0) + 1 }));
      playLockedCue();
      return;
    }
    rememberFocus();
    setDenial(undefined);
    offer(id);
  }
  function closeOffer() {
    dismiss();
    if (!pending?.fromHub) restoreFocus();
  }
  function greet(id: CastId) {
    if (id !== 'gokhan') {
      contact(id);
      return;
    }
    rememberFocus();
    setDenial(undefined);
    setMeetingGuest(true);
  }
  function goToStory(index: number) {
    if (index < 0) setArrival('ideas');
    else setStoryIndex(index);
  }
  if (arrival === 'ideas' && !pending)
    return (
      <BigIdeasIntro
        begin={() => {
          setStoryIndex(0);
          setArrival('story');
        }}
      />
    );
  const overlay = pending ? (
    <DeskIntroduction
      id={pending.id}
      resume={hasStarted(pending.id)}
      cancel={closeOffer}
      confirm={() => confirm(pending.id)}
      mute={mute}
    />
  ) : meetingGuest ? (
    <WelcomeGuide
      close={() => {
        setMeetingGuest(false);
        restoreFocus();
      }}
    />
  ) : story ? (
    <OpeningStory
      key={storyIndex}
      index={storyIndex}
      select={goToStory}
      finish={() => setArrival('controls')}
      mute={mute}
    />
  ) : undefined;
  const tutorial = controls
    ? {
        done: () => setArrival('done'),
        replay: () => {
          setStoryIndex(0);
          setArrival('ideas');
        },
      }
    : undefined;
  const showRoomLinks = arrival === 'done' && !pending && !meetingGuest;

  return (
    <section className="studio-room paper" aria-labelledby="room-title">
      <div className="room-intro">
        <div>
          <h2 id="room-title" className="studio-section-title" tabIndex={-1}>
            {t('yourClassroom')}
          </h2>
          {story && <p>{t('openingSummary')}</p>}
        </div>
        <div hidden={!showRoomLinks}>
          <nav className="desk-list" aria-label={t('classroomDesks')}>
            {desks.map((item, index) => {
              const locked = !unlocked(item.id);
              return (
                <button
                  className={'quiet' + (locked ? ' locked-shortcut' : '')}
                  type="button"
                  key={item.id}
                  aria-current={index === current ? 'location' : undefined}
                  onClick={() => contact(item.id)}
                >
                  {missionContent(item.id, locale).label}
                  {locked && (
                    <>
                      <span className="sr"> ({t('locked')})</span>
                      <LockIcon className="shortcut-lock" size={15} aria-hidden="true" />
                    </>
                  )}
                </button>
              );
            })}
            <button className="quiet" type="button" onClick={() => greet('gokhan')}>
              {t('meetGuide', { name: guest.name })}
            </button>
          </nav>
        </div>
      </div>
      <ClassroomWorld
        current={current}
        view={pending?.id ?? (meetingGuest ? 'gokhan' : story ? openingScenes[storyIndex].view : undefined)}
        overlay={overlay}
        tutorial={tutorial}
        unlocked={unlocked}
        denial={denial && !unlocked(denial.id) ? denial : undefined}
        onDesk={contact}
        onCharacter={greet}
      />
    </section>
  );
}
function Debrief({ id, next }: { id: MissionId; next: () => void }) {
  const item = missions[id];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="debrief" aria-labelledby="debrief-title" lang="en">
      <Stars earned={stages} />
      <h2 id="debrief-title" ref={heading} tabIndex={-1}>
        Mission debrief
      </h2>
      <p>
        <strong>{item.idea}</strong> · You used three AI literacy perspectives in one classroom task.
      </p>
      <ul>
        {stages.map((stage, index) => (
          <li className={stage} key={stage}>
            <b>{roles[stage]}</b> {item.debrief[index]}
          </li>
        ))}
      </ul>
      <p>
        <strong>Future educator takeaway</strong> · {item.takeaway}
      </p>
      <button className="primary" onClick={next}>
        Return to the studio
      </button>
    </section>
  );
}
type StudioProps = {
  account?: { access: Access; checkpoint: StudioCheckpoint; signOut: () => void; reconnect: () => void };
  preview?: boolean;
  previewSignOut?: () => void;
  localPreview?: boolean;
};

export function Studio({ account, preview = false, previewSignOut, localPreview = true }: StudioProps) {
  const { t, locale, href } = useI18n();
  const local = !account && !preview;
  const initial = account?.checkpoint.state;
  const [progress, setProgress] = useState<Progress>(() =>
    local ? load('progress', {}) : (initial?.progress ?? {}),
  );
  const [lesson, setLesson] = useState(() =>
    local
      ? (load<SoundLesson | undefined>(soundLessonKey, undefined) ??
        migrateSoundLesson(
          load<LegacySoundLesson | undefined>('lesson.transcript', undefined),
          progress.transcript ?? [],
        ))
      : (initial?.lesson ?? newSoundLesson()),
  );
  const [stationLessons, setStationLessons] = useState<StationLessons>(() =>
    local ? load(stationLessonsKey, {}) : (initial?.stations ?? {}),
  );
  const [work, setWork] = useState<StudioState['work']>(() => initial?.work ?? {});
  const saveWork = useCallback((id: MissionId, value: Record<string, unknown>) => {
    setWork((previous) => ({ ...previous, [id]: value }));
  }, []);
  const [lessonSaved, setLessonSaved] = useState<boolean>();
  const [demoLesson, setDemoLesson] = useState(() => newSoundLesson());
  const [demoStationLessons, setDemoStationLessons] = useState<StationLessons>({});
  const [instructor, setInstructor] = useState(preview);
  const [mute, setMute] = useState(true);
  const { enableSound, playLockedCue } = useStudioSound(mute);
  const [screen, setScreen] = useState<Screen>(() => (initial?.activeMission ? 'tool' : 'room'));
  const [arrival, setArrival] = useState<Arrival>(() =>
    preview
      ? 'done'
      : local
        ? load('arrival-v3', 'ideas')
        : initial?.storyFinished || initial?.arrival === 'story'
          ? initial.arrival
          : 'ideas',
  );
  const storyFinished = arrival === 'controls' || arrival === 'done';
  const [guideSession, setGuideSession] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [pending, setPending] = useState<MissionOffer>();
  const [current, setCurrent] = useState(() =>
    initial?.activeMission ? missionIds.indexOf(initial.activeMission) : 0,
  );
  const [debrief, setDebrief] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const missionId = missionIds[current];
  const mission = missionContent(missionId, locale);
  const earned = instructor ? [] : (progress[missionId] ?? []);
  const soundMission = missionId === 'transcript';
  const activeSoundLesson = instructor ? demoLesson : lesson;
  const activeStationLessons = instructor ? demoStationLessons : stationLessons;
  const activeLesson = soundMission
    ? activeSoundLesson
    : (activeStationLessons[missionId] ?? resumeLesson(earned));
  const saveState = useStudioSave(
    {
      arrival,
      storyFinished: storyFinished || undefined,
      progress,
      stations: stationLessons,
      work,
      activeMission: screen === 'tool' ? missionId : undefined,
      lesson: {
        ...lesson,
        note: lesson.noteSaved ? lesson.note : '',
        reply: lesson.replySaved ? lesson.reply : '',
      },
    },
    account?.access.token,
    account?.checkpoint,
  );
  useEffect(() => {
    if (local) store('progress', progress);
  }, [local, progress]);
  const saveLesson = useCallback(() => {
    if (!local) return;
    const soundSaved = store(soundLessonKey, lesson);
    const stationsSaved = store(stationLessonsKey, stationLessons);
    setLessonSaved(soundSaved && stationsSaved);
  }, [lesson, local, stationLessons]);
  useEffect(saveLesson, [saveLesson]);
  useEffect(() => {
    if (local) store('arrival-v3', arrival);
  }, [arrival, local]);
  const award = useCallback(
    (phase: Stage) => {
      if (instructor) return;
      setProgress((before) =>
        before[missionId]?.includes(phase)
          ? before
          : { ...before, [missionId]: [...(before[missionId] ?? []), phase] },
      );
    },
    [instructor, missionId],
  );
  function updateSoundLesson(patch: Partial<SoundLesson>) {
    const update = instructor ? setDemoLesson : setLesson;
    update((before) => ({ ...before, ...patch }));
  }
  function updateLesson(patch: Partial<LessonProgress>) {
    if (missionId === 'transcript') {
      updateSoundLesson(patch);
      return;
    }
    const update = instructor ? setDemoStationLessons : setStationLessons;
    update((before) => ({
      ...before,
      [missionId]: { ...(before[missionId] ?? resumeLesson(earned)), ...patch },
    }));
  }
  function hasStarted(id: MissionId) {
    if (!instructor && progress[id]?.length) return true;
    return id === 'transcript' ? activeSoundLesson.introDone : Boolean(activeStationLessons[id]?.introDone);
  }
  function unlocked(id: MissionId) {
    const prerequisite = previousStudioMission(id);
    if (instructor || !prerequisite || hasStarted(id) || initial?.activeMission === id) return true;
    return prerequisite === 'transcript'
      ? lesson.previouslyCompleted || finishedGuidedPractice(progress.transcript ?? [], lesson)
      : (progress[prerequisite]?.length ?? 0) === stages.length;
  }
  function open(id: MissionId) {
    if (!unlocked(id)) return;
    setPending(undefined);
    if (arrival === 'controls') setArrival('done');
    setCurrent(missionIds.indexOf(id));
    setDebrief(false);
    setScreen('tool');
  }
  function offer(id: MissionId, fromHub: boolean) {
    if (!unlocked(id)) return;
    setPending({ id, fromHub });
    setCurrent(missionIds.indexOf(id));
    if (fromHub) setScreen('room');
  }
  function dismissOffer() {
    setPending(undefined);
    if (pending?.fromHub) setScreen('hub');
  }
  function navigate(next: Screen) {
    setPending(undefined);
    setScreen(next);
  }
  function showHowToPlay() {
    navigate('room');
    setGuideSession((session) => session + 1);
    setArrival('controls');
  }
  function resetProgress() {
    if (instructor) {
      setDemoLesson(newSoundLesson());
      setDemoStationLessons({});
    } else {
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith(storagePrefix))
          .forEach((key) => localStorage.removeItem(key));
      } catch {
        /* Reset in memory as well. */
      }
      setProgress({});
      setLesson(newSoundLesson());
      setStationLessons({});
      setArrival('ideas');
      setStoryIndex(0);
    }
    setCurrent(0);
    navigate('room');
    setDebrief(false);
    setGuideSession((session) => session + 1);
    dialog.current?.close();
  }
  function changeInstructor() {
    setInstructor(!instructor);
    if (instructor) {
      navigate('room');
      setCurrent(0);
      setDebrief(false);
    } else {
      setDemoLesson(newSoundLesson());
      setDemoStationLessons({});
      if (screen === 'room' && !pending) navigate('hub');
    }
  }
  function finishMission() {
    setDebrief(false);
    setCurrent(Math.min(missionIds.length - 1, current + 1));
    setScreen('room');
  }
  const saveMessage = {
    ready: '',
    saving: t('savingProgress'),
    saved: '',
    failed: t('saveFailed'),
    conflict: t('saveConflict'),
    reconnect: t('sessionExpired'),
  }[saveState.status];

  return (
    <StudioWork.Provider value={account ? { work, save: saveWork } : null}>
      <QuestMasthead
        week={1}
        title={courseTopic({ id: 'w01', topic: 'AI Literacy' }, locale)}
        navigation={
          <nav aria-label={t('studioNavigation')}>
            <button className="quiet" aria-pressed={screen === 'room'} onClick={() => navigate('room')}>
              {t('studio')}
            </button>
            <button className="quiet" aria-pressed={screen === 'hub'} onClick={() => navigate('hub')}>
              {t('missionHub')}
            </button>
          </nav>
        }
        tools={
          <>
            {storyFinished && (
              <button className="text" type="button" onClick={showHowToPlay}>
                {t('howToPlay')}
              </button>
            )}
            <button
              className="text"
              type="button"
              aria-pressed={mute}
              onClick={() => {
                if (mute) enableSound();
                setMute(!mute);
              }}
            >
              {mute ? t('soundMuted') : t('soundOn')}
            </button>
            {local && localPreview && (
              <label>
                <input type="checkbox" checked={instructor} onChange={changeInstructor} />
                {t('instructorMode')}
              </label>
            )}
            {(local || preview) && (
              <button className="text" type="button" onClick={() => dialog.current?.showModal()}>
                {instructor ? t('resetPreview') : t('resetProgress')}
              </button>
            )}
            {account && (
              <button className="text" type="button" onClick={account.signOut}>
                {t('signOut')}
              </button>
            )}
            {previewSignOut && (
              <button className="text" type="button" onClick={previewSignOut}>
                {t('signOut')}
              </button>
            )}
          </>
        }
      />
      <main id="studio-main" tabIndex={-1}>
        {account && (
          <div className="studio-save">
            <span role="status">
              {saveMessage ||
                (saveState.lastSaved &&
                  t('savedTime', {
                    time: new Date(saveState.lastSaved).toLocaleTimeString(locale, {
                      hour: 'numeric',
                      minute: '2-digit',
                    }),
                  }))}
            </span>
            {saveState.status === 'failed' && (
              <button className="text" onClick={saveState.retry}>
                {t('retrySave')}
              </button>
            )}
            {saveState.status === 'reconnect' && (
              <button className="text" onClick={account.reconnect}>
                {t('reconnect')}
              </button>
            )}
            {saveState.status === 'conflict' && (
              <button className="text" onClick={() => location.reload()}>
                {t('loadLatestProgress')}
              </button>
            )}
          </div>
        )}
        {instructor && (
          <p className="callout demo">
            {t(preview ? 'instructorPreview' : 'instructorMode')} · {t('demoNote')}
            {preview && (
              <>
                {' '}
                <a href={href('/instructor')}>{t('returnToInstructor')}</a>
              </>
            )}
          </p>
        )}
        {screen === 'room' && (
          <Room
            key={guideSession}
            {...{
              hasStarted,
              current,
              unlocked,
              arrival,
              setArrival,
              pending,
              mute,
              playLockedCue,
              storyIndex,
              setStoryIndex,
            }}
            offer={(id) => offer(id, false)}
            dismiss={dismissOffer}
            confirm={open}
          />
        )}
        {screen === 'hub' && <Hub {...{ progress, hasStarted, unlocked }} open={(id) => offer(id, true)} />}
        {screen === 'tool' && (
          <article className="bench paper" style={{ '--station': mission.color } as CSSProperties}>
            <div className="tool-top">
              <button className="text" onClick={() => setScreen('room')}>
                <ArrowLeftIcon size={17} /> Studio
              </button>
              <Stars earned={earned} />
            </div>
            <div className="bench-title">
              <MissionIcon id={missionId} />
              <div>
                <p>{mission.idea}</p>
                <h2 className="studio-section-title">{mission.name}</h2>
              </div>
            </div>
            <p className="tool-goal">{mission.task}</p>
            {locale === 'es' && <p>{t('englishMaterials')}</p>}
            <div lang="en" className="studio-lesson-material">
              {debrief ? (
                <Debrief id={missionId} next={finishMission} />
              ) : (
                <WeekOneLesson
                  key={missionId + '-' + instructor}
                  id={missionId}
                  lesson={activeLesson}
                  update={updateLesson}
                  earned={earned}
                  award={award}
                  instructor={instructor}
                  mute={mute}
                  saved={lessonSaved}
                  save={saveLesson}
                  exchange={
                    soundMission ? { lesson: activeSoundLesson, update: updateSoundLesson } : undefined
                  }
                  debrief={() => setDebrief(true)}
                />
              )}
            </div>
          </article>
        )}
      </main>
      <QuestFooter>
        <a
          href={href(questPrintPath('w01'))}
          target={window.self === window.top ? undefined : '_blank'}
          rel="noopener"
        >
          {t('printHandout')}
        </a>
        {window.self !== window.top && (
          <a href={href(weekOneStudioPath)} target="_blank" rel="noopener">
            {t('weekOneNewTab')}
          </a>
        )}
        <a lang="en" href={studioReferences.ideas.url} target="_blank" rel="noreferrer">
          {studioReferences.ideas.label}
        </a>
        <a lang="en" href={studioReferences.udc.url} target="_blank" rel="noreferrer">
          {studioReferences.udc.label}
        </a>
      </QuestFooter>
      <dialog ref={dialog} aria-labelledby="reset-title">
        <h2 id="reset-title">{instructor ? t('resetPreviewQuestion') : t('resetProgressQuestion')}</h2>
        <p>{instructor ? t('resetPreviewNote') : t('resetProgressNote')}</p>
        <div className="options">
          <button className="quiet" onClick={() => dialog.current?.close()}>
            {t('cancel')}
          </button>
          <button className="primary" onClick={resetProgress}>
            {t('resetStudio')}
          </button>
        </div>
      </dialog>
    </StudioWork.Provider>
  );
}
