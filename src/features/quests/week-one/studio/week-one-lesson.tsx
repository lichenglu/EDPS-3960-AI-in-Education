import { useCallback, useEffect, useRef, useState } from 'react';
import { formatClipTime } from './browser-audio';
import { missions } from '@/curriculum/week-01/cases';
import type { StudioMission as MissionId, StudioPhase as Stage } from '@/contracts/studio';
import { ideaReferences, lessonReadings, lessonVideos } from '@/curriculum/week-01/references';
import { exampleNote } from '@/curriculum/week-01/sound-desk';
import type { LessonCheckpoint, SoundLesson } from './sound-desk-data';
import { stages, stageLabels, ToolTabs } from './tool-tabs';
import { HintsTool, ReadingTool, roles, TicketsTool, ToolkitTool, TranscriptTool } from './tools';
import { weekOneLessons } from '@/curriculum/week-01/lessons';

const checkpointLabels = { model: 'I Do', practice: 'We Do', transfer: 'You Do' } as const;
const checkpointIds: LessonCheckpoint[] = ['model', 'practice', 'transfer'];
const tools = {
  transcript: TranscriptTool,
  reading: ReadingTool,
  tickets: TicketsTool,
  hints: HintsTool,
  toolkit: ToolkitTool,
};

export type LessonProgress = Pick<SoundLesson, 'checkpoint' | 'introDone'>;

export function resumeLesson(earned: Stage[]): LessonProgress {
  if (!earned.length) return { checkpoint: 'model', introDone: false };
  return { checkpoint: earned.length === stages.length ? 'transfer' : 'practice', introDone: true };
}

function practiceTab(earned: Stage[]): Stage {
  return stages.find((stage) => !earned.includes(stage)) ?? 'audit';
}

type LessonProps = {
  id: MissionId;
  lesson: LessonProgress;
  update: (patch: Partial<LessonProgress>) => void;
  earned: Stage[];
  award: (stage: Stage) => void;
  instructor: boolean;
  mute: boolean;
  saved?: boolean;
  save: () => void;
  debrief: () => void;
  exchange?: {
    lesson: SoundLesson;
    update: (patch: Partial<SoundLesson>) => void;
  };
};

export function WeekOneLesson({
  id,
  lesson,
  update,
  earned,
  award,
  instructor,
  mute,
  saved,
  save,
  debrief,
  exchange,
}: LessonProps) {
  const content = weekOneLessons[id];
  const checkpoint = lesson.checkpoint;
  const title = { model: content.introTitle, practice: content.practiceTitle, transfer: 'Quick check' };
  const [stage, selectTab] = useState(() => practiceTab(earned));
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const openBottle = useRef<HTMLButtonElement>(null);
  useEffect(() => heading.current?.focus(), [checkpoint]);
  const awardPractice = useCallback(() => award(stage), [award, stage]);

  const practiced =
    stages.every((phase) => earned.includes(phase)) && (!exchange || exchange.lesson.replySaved);
  const completed = { model: lesson.introDone, practice: practiced };
  const available = {
    model: true,
    practice: instructor || lesson.introDone,
    transfer: instructor || practiced,
  };
  const nextStage = stages[stages.indexOf(stage) + 1];
  const canOpenExchange = Boolean(exchange) && stage === 'audit' && (instructor || earned.includes('audit'));
  const Tool = tools[id];
  const toolProps = { stage, award: awardPractice, mute, instructor };

  function changeCheckpoint(next: LessonCheckpoint) {
    if (!available[next]) return;
    update({ checkpoint: next });
    setExchangeOpen(false);
    if (next === 'practice') selectTab(practiceTab(earned));
  }

  function startPractice() {
    update({ checkpoint: 'practice', introDone: true });
    selectTab(practiceTab(earned));
  }

  function advanceTab(next: Stage) {
    selectTab(next);
    requestAnimationFrame(() => document.getElementById('tab-' + next)?.focus());
  }

  return (
    <div className="week-one-lesson">
      <nav
        aria-label={id === 'transcript' ? 'Sound desk checkpoints' : 'Lesson checkpoints'}
        className="lesson-steps"
      >
        {checkpointIds.map((step, index) => (
          <div key={step}>
            <button
              className="quiet"
              type="button"
              disabled={!available[step]}
              aria-current={checkpoint === step ? 'step' : undefined}
              onClick={() => changeCheckpoint(step)}
            >
              {checkpointLabels[step]}
            </button>
            <small>
              {content.minutes[index]} min
              {step === 'transfer'
                ? ' · Optional'
                : !available[step]
                  ? ' · Locked'
                  : completed[step]
                    ? ' · Complete'
                    : ''}
            </small>
          </div>
        ))}
      </nav>
      <div className="lesson-intro">
        <h2 ref={heading} tabIndex={-1}>
          {checkpointLabels[checkpoint]} · {title[checkpoint]}
        </h2>
        {checkpoint === 'practice' && <p>{content.practiceIntro}</p>}
        {checkpoint === 'transfer' && (
          <p>
            Two optional, ungraded questions. See explanations for your choices or go straight to the debrief.
            Your answers stay on this screen.
          </p>
        )}
        {!instructor && saved === false && (
          <div className="callout">
            <p role="status">This browser couldn’t save the lesson. Keep this tab open to keep working.</p>
            <button className="quiet" type="button" onClick={save}>
              Retry save
            </button>
          </div>
        )}
      </div>
      {checkpoint === 'model' && <LessonIntroduction id={id} next={startPractice} />}
      {checkpoint === 'transfer' && <KnowledgeCheck id={id} next={debrief} />}
      {checkpoint === 'practice' &&
        (exchange && exchangeOpen ? (
          <PracticeExchange
            {...exchange}
            close={() => {
              setExchangeOpen(false);
              requestAnimationFrame(() => openBottle.current?.focus());
            }}
            next={() => changeCheckpoint('transfer')}
            instructor={instructor}
          />
        ) : (
          <div>
            <ToolTabs
              stage={stage}
              select={selectTab}
              available={(_, index) => instructor || index === 0 || earned.includes(stages[index - 1])}
            />
            <section
              className="work-surface"
              role="tabpanel"
              id="work-surface"
              aria-labelledby={'tab-' + stage}
              tabIndex={0}
            >
              <Tool {...toolProps} />
              <div className="tool-next">
                {(earned.includes(stage) || instructor) && nextStage && (
                  <>
                    {earned.includes(stage) && (
                      <span className={stage} role="status">
                        ★ {roles[stage]} Star earned
                      </span>
                    )}
                    <button className="primary" type="button" onClick={() => advanceTab(nextStage)}>
                      Open {stageLabels[nextStage]}
                    </button>
                  </>
                )}
                {canOpenExchange && (
                  <button
                    ref={openBottle}
                    className="primary"
                    type="button"
                    onClick={() => setExchangeOpen(true)}
                  >
                    Open Drift Bottle
                  </button>
                )}
                {!exchange && (practiced || (instructor && stage === 'audit')) && (
                  <>
                    <button className="primary" type="button" onClick={() => changeCheckpoint('transfer')}>
                      Open quick check
                    </button>
                    <button className="quiet" type="button" onClick={debrief}>
                      {instructor ? 'Preview mission debrief' : 'Skip to debrief'}
                    </button>
                  </>
                )}
              </div>
            </section>
          </div>
        ))}
    </div>
  );
}

function LessonIntroduction({ id, next }: { id: MissionId; next: () => void }) {
  const [showVideo, setShowVideo] = useState(false);
  const { videoHeading, why, question, keyPoints, perspectives } = weekOneLessons[id];
  const video = lessonVideos[id];
  const reading = lessonReadings[id];
  const { title, publisher, youTubeId, startSeconds, endSeconds, excerpt, captionLanguage } = video;
  const playerOptions = new URLSearchParams({ cc_load_policy: '1', cc_lang_pref: captionLanguage ?? 'en' });
  if (excerpt) {
    playerOptions.set('start', String(startSeconds));
    playerOptions.set('end', String(endSeconds));
  }
  const segment = formatClipTime(startSeconds) + '–' + formatClipTime(endSeconds);
  const watchLink =
    'https://www.youtube.com/watch?v=' + youTubeId + (startSeconds ? '&t=' + startSeconds + 's' : '');
  return (
    <section className="work-surface lesson-panel" aria-labelledby="lesson-video-title">
      <div className="task">
        <h3 id="lesson-video-title">{videoHeading}</h3>
        <p className="caption">
          {publisher} · {formatClipTime(endSeconds - startSeconds)}
          {excerpt ? ' excerpt' : ''} · English captions
        </p>
        <p>{why}</p>
        <p>
          <strong>As you watch</strong> · {question}
        </p>
        <div className="options">
          <button
            type="button"
            className="quiet"
            aria-expanded={showVideo}
            aria-controls="lesson-video"
            onClick={() => setShowVideo((open) => !open)}
          >
            {showVideo ? 'Hide video player' : 'Load captioned video'}
          </button>
          <a className="text" href={watchLink} target="_blank" rel="noreferrer">
            Open on YouTube
          </a>
          {excerpt && <small>{segment}</small>}
        </div>
        <div id="lesson-video" hidden={!showVideo}>
          {showVideo && (
            <iframe
              className="lesson-video-player"
              title={publisher + ' · ' + title + (excerpt ? ' (' + segment + ')' : '')}
              src={'https://www.youtube-nocookie.com/embed/' + youTubeId + '?' + playerOptions}
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
        </div>
      </div>
      <details className="lesson-explainer">
        <summary>Read the key points instead</summary>
        {keyPoints.map((point) => (
          <p key={point}>{point}</p>
        ))}
        {reading && (
          <p>
            <a href={reading.url} target="_blank" rel="noreferrer">
              {reading.title} · {reading.publisher}
            </a>
          </p>
        )}
      </details>
      <div className="lesson-intro">
        <h3>Three perspectives you’ll use</h3>
        <ul className="lesson-perspectives">
          {stages.map((stage, index) => (
            <li key={stage}>
              <strong>{roles[stage]}</strong> · {perspectives[index]}
            </li>
          ))}
        </ul>
        <p>
          <a href={ideaReferences[id].url} target="_blank" rel="noreferrer">
            AI4K12 · {missions[id].idea}
          </a>
        </p>
      </div>
      <button className="primary" type="button" onClick={next}>
        Start guided practice
      </button>
    </section>
  );
}

function KnowledgeCheck({ id, next }: { id: MissionId; next: () => void }) {
  const [answers, setAnswers] = useState<Partial<Record<string, number>>>({});
  const [checked, setChecked] = useState(false);
  return (
    <section className="work-surface lesson-panel">
      <form
        className="knowledge-check"
        aria-label="Check your understanding"
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
        }}
      >
        {weekOneLessons[id].questions.map((question) => {
          const answer = answers[question.id];
          const bestChoice = answer === question.correct;
          const headingId = 'check-' + question.id;
          return (
            <div className="task" key={question.id}>
              <h3 id={headingId}>{question.prompt}</h3>
              <fieldset aria-labelledby={headingId}>
                {question.options.map((option, index) => (
                  <label className="check-option" key={option}>
                    <input
                      type="radio"
                      name={question.id}
                      checked={answer === index}
                      onChange={() => {
                        setAnswers((current) => ({ ...current, [question.id]: index }));
                        setChecked(false);
                      }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
                <div aria-live="polite" aria-atomic="true">
                  {checked && answer !== undefined && (
                    <p className={'callout check-feedback' + (bestChoice ? '' : ' check-feedback-retry')}>
                      <strong>{bestChoice ? 'Best choice' : 'A better choice is available'}</strong>
                      <span>{bestChoice ? question.correctFeedback : question.retryFeedback}</span>
                    </p>
                  )}
                </div>
              </fieldset>
            </div>
          );
        })}
        <div className="options">
          <button className="primary" type="submit" disabled={Object.keys(answers).length === 0}>
            Check answers
          </button>
          <button className="quiet" type="button" onClick={next}>
            Continue to debrief
          </button>
        </div>
      </form>
    </section>
  );
}

function PracticeExchange({
  lesson,
  update,
  close,
  next,
  instructor,
}: {
  lesson: SoundLesson;
  update: (patch: Partial<SoundLesson>) => void;
  close: () => void;
  next: () => void;
  instructor: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="work-surface exchange" aria-labelledby="drift-title">
      <h3 id="drift-title" tabIndex={-1} ref={heading}>
        Drift Bottle
      </h3>
      <p>
        Share one decision from the garden case. Say what you checked, what you found, and what you would do
        next.
      </p>
      <p className="caption">
        Practice exchange. Use the fictional case details. You’ll reply to an example note.
      </p>
      <form
        className="task lesson-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (lesson.note.trim()) update({ noteSaved: true });
        }}
      >
        <label>
          Your reasoning
          <textarea
            rows={3}
            value={lesson.note}
            readOnly={lesson.noteSaved}
            maxLength={800}
            required
            onChange={(event) => update({ note: event.target.value })}
          />
        </label>
        {!lesson.noteSaved && (
          <button className="primary" type="submit" disabled={!lesson.note.trim()}>
            Save my note
          </button>
        )}
        {lesson.noteSaved && <p role="status">Your note is ready. Read the example below.</p>}
      </form>
      {lesson.noteSaved && (
        <>
          <blockquote className="callout">
            <strong>Example classmate note</strong>
            <p>{exampleNote}</p>
          </blockquote>
          <form
            className="task lesson-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (lesson.reply.trim()) update({ replySaved: true });
            }}
          >
            <p>Reply with a piece of evidence or a check the classmate could try.</p>
            <label>
              Your reply
              <textarea
                rows={3}
                value={lesson.reply}
                readOnly={lesson.replySaved}
                maxLength={800}
                required
                onChange={(event) => update({ reply: event.target.value })}
              />
            </label>
            {!lesson.replySaved && (
              <button className="primary" type="submit" disabled={!lesson.reply.trim()}>
                Save my reply
              </button>
            )}
            {lesson.replySaved && <p role="status">Your reply is ready.</p>}
          </form>
        </>
      )}
      <div className="tool-next">
        <button className="quiet" type="button" onClick={close}>
          Return to the garden case
        </button>
        {(lesson.replySaved || instructor) && (
          <button className="primary" type="button" onClick={next}>
            Open quick check
          </button>
        )}
      </div>
    </section>
  );
}
