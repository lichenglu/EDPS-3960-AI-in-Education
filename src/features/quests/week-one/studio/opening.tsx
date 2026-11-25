import { useI18n } from '@/lib/i18n/I18n';
import { missionContent } from '@/curriculum/week-01/locales';
import { Button } from 'animal-island-ui';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CloseIcon,
  MessageCircleIcon,
  MicIcon,
} from 'naive-icons';
import { useEffect, useRef, useState } from 'react';
import { studioMissionIds as missionIds, type StudioMission as MissionId } from '@/contracts/studio';
import { ideaReferences, studioReferences } from '@/curriculum/week-01/references';
import { openingDemo, openingScenes } from '@/curriculum/week-01/story';
import { NarrationButton } from './browser-audio';
import { getGuide, guest } from './studio-layout';

function ConceptLink({ id, showArrow = false }: { id: MissionId; showArrow?: boolean }) {
  const { locale } = useI18n();
  return (
    <a href={ideaReferences[id].url} target="_blank" rel="noreferrer">
      {missionContent(id, locale).idea}
      {showArrow && <ArrowRightIcon size={16} aria-hidden="true" />}
    </a>
  );
}

export function BigIdeasIntro({ begin }: { begin: () => void }) {
  const { t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);

  return (
    <section className="paper ideas-intro" aria-labelledby="ideas-title">
      <div className="ideas-heading">
        <h1 id="ideas-title" ref={heading} tabIndex={-1}>
          {t('fiveIdeas')}
        </h1>
        <p>{t('fiveIdeasDescription')}</p>
      </div>
      <figure className="ideas-wheel">
        <img
          src="/studio/references/ai4k12-five-big-ideas.png"
          alt="AI4K12 wheel showing Perception, Representation &amp; Reasoning, Learning, and Natural Interaction around Societal Impact."
          width={1150}
          height={1142}
        />
        <figcaption>
          <a href={studioReferences.poster.url} target="_blank" rel="noreferrer">
            {studioReferences.poster.label}
          </a>
          {' · '}
          <a href={studioReferences.license.url} target="_blank" rel="noreferrer">
            {studioReferences.license.label}
          </a>
        </figcaption>
      </figure>
      <div className="ideas-copy">
        <ol className="ideas-list" role="list">
          {missionIds.map((id) => (
            <li key={id}>
              <ConceptLink id={id} showArrow />
            </li>
          ))}
        </ol>
        <Button className="opening-start" type="primary" htmlType="button" onClick={begin}>
          <span>
            {t('beginStory')} <ArrowRightIcon size={17} aria-hidden="true" />
          </span>
        </Button>
      </div>
    </section>
  );
}

export function OpeningStory({
  index,
  select,
  finish,
  mute,
}: {
  index: number;
  select: (index: number) => void;
  finish: () => void;
  mute: boolean;
}) {
  const { t } = useI18n();
  const scene = openingScenes[index];
  const guide = getGuide(scene.speaker);
  const heading = useRef<HTMLHeadingElement>(null);
  const [demoIndex, setDemoIndex] = useState(0);
  const demo = openingDemo[demoIndex];
  const last = index === openingScenes.length - 1;
  useEffect(() => heading.current?.focus({ preventScroll: true }), [index]);
  return (
    <section
      className={'scene-overlay story-overlay' + (scene.demo ? ' framework-overlay' : '')}
      aria-labelledby="opening-title"
    >
      <div className="scene-kicker">
        <BookOpenIcon size={19} /> {t('openingStory')}{' '}
        <span>
          {index + 1} / {openingScenes.length}
        </span>
      </div>
      <h2 ref={heading} tabIndex={-1} id="opening-title" lang="en">
        {scene.title}
      </h2>
      <p className="scene-speaker">
        {guide.name} · <span lang="en">{guide.role}</span>
      </p>
      <p lang="en">{scene.dialogue}</p>
      {scene.narration && <NarrationButton text={scene.dialogue} speaker={guide.name} mute={mute} />}
      {scene.concept && (
        <p className="scene-note">
          <ConceptLink id={scene.concept} />
          {' · '}
          <span lang="en">{ideaReferences[scene.concept].summary}</span>
        </p>
      )}
      {scene.demo && (
        <p lang="en">
          <a href={studioReferences.udc.url} target="_blank" rel="noreferrer">
            {studioReferences.udc.action}
          </a>
        </p>
      )}
      {scene.demo && (
        <div className="opening-demo" lang="en">
          <div className="demo-actions" aria-label="Try the three perspectives">
            {openingDemo.map((option, position) => (
              <button
                type="button"
                className={'quiet ' + option.key}
                aria-pressed={position === demoIndex}
                key={option.key}
                onClick={() => setDemoIndex(position)}
              >
                {option.action}
                <small>{option.role}</small>
              </button>
            ))}
          </div>
          <p className="demo-output" aria-live="polite">
            <strong>{demo.line}</strong>
            <br />
            {demo.explanation}
          </p>
        </div>
      )}
      <div className="scene-actions">
        <button type="button" className="quiet" onClick={() => select(index - 1)}>
          <ArrowLeftIcon size={16} /> {index ? t('back') : t('fiveIdeasShort')}
        </button>
        <button type="button" className="primary" onClick={last ? finish : () => select(index + 1)}>
          {last ? t('learnControls') : t('continueStory')}
          <ArrowRightIcon size={17} />
        </button>
      </div>
    </section>
  );
}

export type WalkthroughStep = 0 | 1 | 2;
const firstMission = missionIds[0];
const firstGuide = getGuide(firstMission).name;

export function Walkthrough({
  step,
  moved,
  looked,
  select,
  walk,
  turn,
  face,
  open,
  close,
  replay,
  hasScene,
}: {
  step: WalkthroughStep;
  moved: boolean;
  looked: boolean;
  select: (step: WalkthroughStep) => void;
  walk: () => void;
  turn: () => void;
  face: () => void;
  open: () => void;
  close: () => void;
  replay: () => void;
  hasScene: boolean;
}) {
  const { t, locale } = useI18n();
  const firstDesk = missionContent(firstMission, locale).label;
  const instructions = [
    { title: t('takeStep'), body: t('walkInstructions') },
    { title: t('lookAround'), body: t('lookInstructions') },
    {
      title: t('openDesk', { desk: firstDesk }),
      body: t(firstMission === 'transcript' ? 'soundDeskInstructions' : 'deskInstructions', {
        name: firstGuide,
      }),
    },
  ] as const;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), [step]);
  return (
    <section className="scene-overlay walkthrough-overlay" aria-labelledby="walkthrough-title">
      <div className="scene-kicker">
        <MicIcon size={18} /> {t('studioControls')} <span>{step + 1} / 3</span>
        <button
          className="quiet icon-control tutorial-close"
          type="button"
          onClick={close}
          aria-label={t('closeTutorial')}
          aria-keyshortcuts="Escape"
          title={t('closeTutorial')}
        >
          <CloseIcon size={18} />
        </button>
      </div>
      <h2 ref={heading} tabIndex={-1} id="walkthrough-title">
        {instructions[step].title}
      </h2>
      <p>{hasScene ? instructions[step].body : t('tutorialFallback')}</p>
      {hasScene && step === 0 && (
        <p className="control-keys" aria-label="W, A, S, D">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd>
        </p>
      )}
      {hasScene && ((step === 0 && moved) || (step === 1 && looked)) && (
        <p role="status" className="step-feedback">
          {step === 0 ? t('moved') : t('looked')}
        </p>
      )}
      <div className="scene-actions">
        {hasScene && step === 0 && (
          <button className="quiet" type="button" onClick={walk}>
            {t('tryStep')}
          </button>
        )}
        {hasScene && step === 1 && (
          <button className="quiet" type="button" onClick={turn}>
            {t('tryTurn')}
          </button>
        )}
        {hasScene && step === 2 && (
          <button className="quiet" type="button" onClick={face}>
            {t('faceDesk')}
          </button>
        )}
        {step === 0 && (
          <button className="primary" type="button" onClick={() => select(1)}>
            {t('nextLook')}
          </button>
        )}
        {step === 1 && (
          <button
            className="primary"
            type="button"
            onClick={() => {
              face();
              select(2);
            }}
          >
            {t('nextDesk')}
          </button>
        )}
        {step === 2 && (
          <button className="primary" type="button" onClick={open}>
            {t('startDesk', { desk: firstDesk })}
          </button>
        )}
      </div>
      <div className="scene-links">
        {step > 0 && (
          <button className="text" type="button" onClick={() => select(step === 2 ? 1 : 0)}>
            {t('previousStep')}
          </button>
        )}
        <button className="text" type="button" onClick={replay}>
          {t('replayOpening')}
        </button>
      </div>
    </section>
  );
}

export function DeskIntroduction({
  id,
  resume,
  confirm,
  cancel,
  mute,
}: {
  id: MissionId;
  resume: boolean;
  confirm: () => void;
  cancel: () => void;
  mute: boolean;
}) {
  const { t, locale } = useI18n();
  const mission = missionContent(id, locale);
  const guide = getGuide(id);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), [id]);

  return (
    <section
      className="scene-overlay desk-speech"
      aria-labelledby="desk-speech-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') cancel();
      }}
    >
      <div className="scene-kicker">
        <MessageCircleIcon size={19} /> {mission.label} <span>{mission.idea}</span>
      </div>
      <h2 ref={heading} tabIndex={-1} id="desk-speech-title">
        {mission.name}
      </h2>
      <p className="scene-speaker">
        {guide.name} · <span lang="en">{guide.role}</span>
      </p>
      <p lang="en">{guide.greeting}</p>
      {id === 'transcript' && <NarrationButton text={guide.greeting} speaker={guide.name} mute={mute} />}
      <p className="scene-note">
        <strong>{t('yourTask')}</strong> · {mission.task} {mission.success}
      </p>
      <div className="scene-actions">
        <button className="quiet" type="button" onClick={cancel}>
          {t('cancel')}
        </button>
        <button className="primary" type="button" onClick={confirm}>
          {resume ? t('confirmResume') : t('confirmStart')}
          <ArrowRightIcon size={17} />
        </button>
      </div>
    </section>
  );
}

export function WelcomeGuide({ close }: { close: () => void }) {
  const { t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);

  return (
    <section
      className="scene-overlay desk-speech"
      aria-labelledby="welcome-guide-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') close();
      }}
    >
      <div className="scene-kicker">
        <MessageCircleIcon size={19} /> {t('welcomeBench')}
      </div>
      <h2 ref={heading} tabIndex={-1} id="welcome-guide-title">
        {guest.name}
      </h2>
      <p className="scene-speaker" lang="en">
        {guest.role}
      </p>
      <p lang="en">{guest.greeting}</p>
      <div className="scene-actions">
        <button className="primary" type="button" onClick={close}>
          {t('backToClassroom')}
        </button>
      </div>
    </section>
  );
}
