import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { IntroFilm, IntroScene } from '@/contracts/intro-film';
import { useI18n } from '@/lib/i18n/I18n';
import { createFilmMusic } from './intro-film/music';
import { localEnglishVoice, speakFilmCue } from './intro-film/speech';
import './intro-film.css';

const FilmCanvas = lazy(async () => ({ default: (await import('./intro-film/FilmCanvas')).FilmCanvas }));

class FilmArtwork extends Component<{ children: ReactNode; fallback: ReactNode }, { unavailable: boolean }> {
  state = { unavailable: false };

  static getDerivedStateFromError() {
    return { unavailable: true };
  }

  render() {
    return this.state.unavailable ? this.props.fallback : this.props.children;
  }
}

type Cue = {
  scene: IntroScene;
  sceneIndex: number;
  sceneStart: number;
  text: string;
  start: number;
  end: number;
};

function makeTimeline(scenes: readonly IntroScene[]) {
  let time = 0;
  const segmenter =
    typeof Intl.Segmenter === 'function' && new Intl.Segmenter('en', { granularity: 'sentence' });
  return scenes.flatMap((scene, sceneIndex): Cue[] => {
    const sceneStart = time;
    const sentences = segmenter
      ? Array.from(segmenter.segment(scene.narration), ({ segment }) => segment.trim())
      : scene.narration.trim().split(/(?<=[.!?])\s+(?=[A-Z“])/);
    const segments = sentences.filter(Boolean);
    const captions = segments.length ? segments : [''];
    const duration = Math.max(0.1, scene.duration);
    const counts = captions.map((text) => Math.max(3, text.split(/\s+/).length));
    const words = counts.reduce((sum, count) => sum + count, 0);
    return captions.map((text, index) => {
      const start = time;
      time =
        index === captions.length - 1 ? sceneStart + duration : time + (duration * counts[index]) / words;
      return { scene, sceneIndex, sceneStart, text, start, end: time };
    });
  });
}

function formatTime(seconds: number) {
  const time = Math.floor(seconds);
  return Math.floor(time / 60) + ':' + String(time % 60).padStart(2, '0');
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  return reduced;
}

function Transcript({ scenes }: { scenes: readonly IntroScene[] }) {
  const { t } = useI18n();
  return (
    <ol className="intro-film-transcript-list">
      {scenes.map(({ id, title, narration, description }) => (
        <li key={id}>
          <strong lang="en">{title}</strong>
          <p lang="en">{narration}</p>
          <p className="intro-film-description">
            <span>{t('introFilmVisual')}</span> <span lang="en">{description}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

function FilmPlayback({ film }: { film: IntroFilm }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const cues = useMemo(() => makeTimeline(film.scenes), [film.scenes]);
  const duration = cues.at(-1)?.end ?? 0;
  const cursor = useRef({ time: 0, index: 0 });
  const [frame, setFrame] = useState(cursor.current);
  const [playing, setPlaying] = useState(false);
  const [restart, setRestart] = useState(0);
  const [captions, setCaptions] = useState(true);
  const [narration, setNarration] = useState(true);
  const [music, setMusic] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenFailed, setFullscreenFailed] = useState(false);
  const [voice, setVoice] = useState(localEnglishVoice);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const screen = useRef<HTMLDivElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const stopSpeech = useRef<(() => void) | undefined>(undefined);
  const score = useRef<ReturnType<typeof createFilmMusic> | undefined>(undefined);
  const cue = cues[frame.index];
  const narrationReady = Boolean(voice && !voiceFailed);
  const ended = frame.time >= duration;
  const fullscreenAvailable =
    !fullscreenFailed &&
    document.fullscreenEnabled &&
    typeof Element.prototype.requestFullscreen === 'function' &&
    typeof document.exitFullscreen === 'function';

  useEffect(() => {
    const sync = () =>
      setFullscreen(Boolean(screen.current && document.fullscreenElement === screen.current));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  async function toggleFullscreen() {
    const target = screen.current;
    if (!target) return;
    try {
      if (document.fullscreenElement === target) await document.exitFullscreen();
      else await target.requestFullscreen();
    } catch {
      setFullscreenFailed(true);
      playButton.current?.focus();
    }
  }

  useEffect(() => {
    const synth = window.speechSynthesis;
    const sync = () => {
      const next = localEnglishVoice();
      setVoice((previous) => (previous?.voiceURI === next?.voiceURI ? previous : next));
    };
    sync();
    synth?.addEventListener('voiceschanged', sync);
    return () => synth?.removeEventListener('voiceschanged', sync);
  }, []);

  function move(time: number, index: number) {
    cursor.current = { time, index };
    setFrame(cursor.current);
  }

  function cancelSpeech() {
    stopSpeech.current?.();
    stopSpeech.current = undefined;
  }

  function pause() {
    cancelSpeech();
    score.current?.stop();
    setPlaying(false);
  }

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) pause();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      cancelSpeech();
      score.current?.dispose();
      score.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (!playing || !narration || !voice || voiceFailed || !cue?.text) return;
    let timeout: number | undefined;
    let finished = false;
    const finish = (success: boolean) => {
      finished = true;
      window.clearTimeout(timeout);
      stopSpeech.current = undefined;
      score.current?.setDucked(false);
      if (!success) setVoiceFailed(true);
    };
    const cancel = speakFilmCue(voice, cue.text, finish);
    if (!cancel) {
      finish(false);
      return;
    }
    if (finished) return;
    score.current?.setDucked(true);
    const release = () => {
      window.clearTimeout(timeout);
      cancel();
    };
    stopSpeech.current = release;
    // Some platforms expose a voice but never report the end of an utterance.
    timeout = window.setTimeout(
      () => {
        release();
        finish(false);
      },
      Math.max(20, (cue.end - cue.start) * 4) * 1000,
    );
    return release;
  }, [playing, narration, voice, voiceFailed, cue, restart]);

  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    let animation: number;
    function tick(now: number) {
      const { time, index } = cursor.current;
      const current = cues[index];
      const elapsed = time + Math.min(0.15, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (elapsed < current.end) move(elapsed, index);
      else if (stopSpeech.current) {
        // Keep the visual and caption on the current cue until the voice ends.
        const held = Math.max(current.start, current.end - 0.01);
        if (time !== held) move(held, index);
      } else if (index < cues.length - 1) move(current.end, index + 1);
      else {
        move(duration, index);
        pause();
        return;
      }
      animation = requestAnimationFrame(tick);
    }
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [playing, cues, duration, restart]);

  function startMusic(ducked: boolean) {
    if (typeof window.AudioContext !== 'function') return;
    try {
      score.current ??= createFilmMusic();
      score.current.start(ducked);
    } catch {
      /* All film content remains available when Web Audio is blocked. */
    }
  }

  function play() {
    if (ended) {
      replay();
      return;
    }
    if (music) startMusic(narration && narrationReady);
    setPlaying(true);
  }

  function replay() {
    cancelSpeech();
    score.current?.stop();
    move(0, 0);
    setRestart((count) => count + 1);
    if (music) startMusic(narration && narrationReady);
    setPlaying(true);
  }

  function seek(value: number) {
    pause();
    const time = Math.max(0, Math.min(value, duration));
    const index = cues.findIndex(({ end }) => time < end);
    move(time, index < 0 ? cues.length - 1 : index);
  }

  function seekScene(index: number) {
    const next = cues.find(({ sceneIndex }) => sceneIndex === index);
    if (next) seek(next.sceneStart);
  }

  if (!cue) return null;
  const sceneProgress = Math.min(1, (frame.time - cue.sceneStart) / Math.max(0.1, cue.scene.duration));
  const timing = t('introFilmTiming', { elapsed: formatTime(frame.time), total: formatTime(duration) });
  const poster = (
    <div className="intro-film-poster" lang="en">
      {cue.scene.description}
    </div>
  );
  return (
    <div className="intro-film-screen" ref={screen}>
      <figure className="intro-film-frame">
        <FilmArtwork fallback={poster}>
          <Suspense fallback={poster}>
            <FilmCanvas
              scene={cue.scene}
              progress={sceneProgress}
              playing={playing}
              reducedMotion={reduced}
            />
          </Suspense>
        </FilmArtwork>
        <figcaption className="intro-film-scene">
          <span>{t('introFilmScene', { current: cue.sceneIndex + 1, total: film.scenes.length })}</span>
          <strong lang="en">{cue.scene.title}</strong>
        </figcaption>
      </figure>
      {captions && (
        <p className="intro-film-caption" lang="en">
          {cue.text}
        </p>
      )}
      <div className="intro-film-controls">
        <div className="intro-film-buttons">
          <button type="button" className="intro-film-play" ref={playButton} onClick={playing ? pause : play}>
            {t(playing ? 'introFilmPause' : 'introFilmPlay')}
          </button>
          <button type="button" onClick={replay}>
            {t('introFilmReplay')}
          </button>
          <button type="button" disabled={cue.sceneIndex === 0} onClick={() => seekScene(cue.sceneIndex - 1)}>
            {t('introFilmPrevious')}
          </button>
          <button
            type="button"
            disabled={cue.sceneIndex === film.scenes.length - 1}
            onClick={() => seekScene(cue.sceneIndex + 1)}
          >
            {t('introFilmNext')}
          </button>
          {(fullscreenAvailable || fullscreen) && (
            <button type="button" className="intro-film-fullscreen" onClick={toggleFullscreen}>
              {t(fullscreen ? 'introFilmExitFullscreen' : 'introFilmFullscreen')}
            </button>
          )}
        </div>
        <div className="intro-film-seek">
          <input
            type="range"
            aria-label={t('introFilmSeek')}
            aria-valuetext={timing}
            min={0}
            max={duration}
            step={0.1}
            value={frame.time}
            onChange={(event) => seek(event.currentTarget.valueAsNumber)}
          />
          <span aria-hidden="true">{timing}</span>
        </div>
        <div className="intro-film-preferences">
          <label>
            <input
              type="checkbox"
              checked={captions}
              onChange={(event) => setCaptions(event.currentTarget.checked)}
            />{' '}
            {t('introFilmCaptions')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={narration && narrationReady}
              disabled={!narrationReady}
              onChange={(event) => {
                setNarration(event.currentTarget.checked);
                if (!event.currentTarget.checked) {
                  cancelSpeech();
                  if (playing) score.current?.setDucked(false);
                }
              }}
            />{' '}
            {t('introFilmNarration')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={music}
              onChange={(event) => {
                setMusic(event.currentTarget.checked);
                if (!event.currentTarget.checked) score.current?.stop();
                else if (playing) startMusic(Boolean(stopSpeech.current));
              }}
            />{' '}
            {t('introFilmMusic')}
          </label>
        </div>
        <p className="intro-film-voice" role="status">
          {narrationReady
            ? t('introFilmVoicePreview', { voice: film.voiceLabel })
            : t('introFilmNarrationUnavailable')}
        </p>
      </div>
    </div>
  );
}

export function IntroFilmPlayer({ film, textView = false }: { film: IntroFilm; textView?: boolean }) {
  const { t } = useI18n();
  const heading = useId();
  return (
    <section className={textView ? 'intro-film intro-film--text' : 'intro-film'} aria-labelledby={heading}>
      <div className="intro-film-heading" lang="en">
        <h3 id={heading}>{film.title}</h3>
        <p>{film.guidingQuestion}</p>
      </div>
      {textView ? (
        <div className="intro-film-transcript">
          <h4>{t('introFilmTranscript')}</h4>
          <Transcript scenes={film.scenes} />
        </div>
      ) : (
        <>
          <FilmPlayback key={film.id} film={film} />
          <details className="intro-film-transcript">
            <summary>{t('introFilmTranscript')}</summary>
            <Transcript scenes={film.scenes} />
          </details>
        </>
      )}
      {film.sources.length > 0 && (
        <div className="intro-film-sources">
          <h4>{t('introFilmSources')}</h4>
          <ul>
            {film.sources.map(({ label, url }) => (
              <li key={url}>
                <a href={url} lang="en">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
