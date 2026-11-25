import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/I18n';
import { activeLessonVideoCue, alignLessonVideoCues, type LessonVideoCue } from './lesson-video-timing';
import './lesson-video.css';

export type LessonVideoTranscriptEntry = {
  id: string;
  lines: readonly string[];
  description?: string;
  annotation?: string;
};

export type LessonVideoProps = {
  title: string;
  src: string;
  poster?: string;
  captions: { src: string; srcLang: string; label: string };
  transcript: readonly LessonVideoTranscriptEntry[];
  lang?: string;
  textOnly?: boolean;
};

/** Native video plus an optional, bounded transcript. VTT is the only timing source. */
export function LessonVideo({
  title,
  src,
  poster,
  captions,
  transcript,
  lang = 'en',
  textOnly = false,
}: LessonVideoProps) {
  const { locale, t } = useI18n();
  const transcriptId = useId();
  const video = useRef<HTMLVideoElement>(null);
  const captionElement = useRef<HTMLTrackElement>(null);
  const script = useRef<HTMLDivElement>(null);
  const initializedMedia = useRef('');
  const loadedCaptions = useRef<{ mediaKey: string; cues: readonly LessonVideoCue[] }>({
    mediaKey: '',
    cues: [],
  });
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const sections = useMemo(() => {
    let index = 0;
    return transcript.map((entry) => ({
      ...entry,
      lines: entry.lines.map((text) => ({ text, index: index++ })),
    }));
  }, [transcript]);
  const lines = useMemo(() => sections.flatMap((entry) => entry.lines.map((line) => line.text)), [sections]);

  useEffect(() => {
    const player = video.current;
    const element = captionElement.current;
    if (textOnly || !player || !element) return;
    const track = element.track;
    const mediaKey = src + '\n' + captions.src;
    if (loadedCaptions.current.mediaKey !== mediaKey) {
      loadedCaptions.current = { mediaKey, cues: [] };
    }
    let cues: readonly LessonVideoCue[] = [];
    setActive(-1);

    function sync() {
      setActive(activeLessonVideoCue(cues, player!.currentTime));
    }
    function loadCues() {
      // Disabled native captions may expose no cues. Keep their timings across prop updates.
      if (track.cues?.length) {
        loadedCaptions.current.cues = Array.from(track.cues, (cue) => ({
          startTime: cue.startTime,
          endTime: cue.endTime,
          text: (cue as VTTCue).text,
        }));
      }
      if (!loadedCaptions.current.cues.length) return;
      const aligned = alignLessonVideoCues(loadedCaptions.current.cues, lines);
      cues = aligned ?? [];
      if (!aligned) console.warn('LessonVideo captions must contain one cue per transcript line, in order.');
      sync();
    }
    if (initializedMedia.current !== mediaKey) {
      initializedMedia.current = mediaKey;
      track.mode = 'showing';
    }
    const events = ['loadedmetadata', 'timeupdate', 'seeking', 'seeked', 'play', 'ended'] as const;
    for (const event of events) player.addEventListener(event, sync);
    element.addEventListener('load', loadCues);
    track.addEventListener('cuechange', sync);
    loadCues();
    return () => {
      for (const event of events) player.removeEventListener(event, sync);
      element.removeEventListener('load', loadCues);
      track.removeEventListener('cuechange', sync);
    };
  }, [src, captions.src, lines, textOnly]);

  useEffect(() => {
    const container = script.current;
    if (!open || active < 0 || !container) return;
    const line = container.querySelector<HTMLElement>(`[data-cue-index="${active}"]`);
    if (!line) return;
    const box = container.getBoundingClientRect();
    const target = line.getBoundingClientRect();
    if (target.top < box.top || target.bottom > box.bottom) {
      // Scroll only this transcript; scrollIntoView would also move the page and iframe.
      container.scrollTop += target.top - box.top - (container.clientHeight - target.height) / 2;
    }
  }, [active, open]);

  const text = (
    <div
      ref={script}
      lang={lang}
      className={textOnly ? 'lesson-video-script' : 'lesson-video-script lesson-video-scroll'}
      role={textOnly ? undefined : 'region'}
      aria-labelledby={textOnly ? undefined : transcriptId}
      tabIndex={textOnly ? undefined : 0}
    >
      {sections.map((entry) => (
        <p key={entry.id}>
          {entry.lines.map((line) => (
            <span
              key={line.index}
              className="lesson-video-line"
              data-cue-index={line.index}
              aria-current={!textOnly && active === line.index ? 'true' : undefined}
            >
              {line.text}{' '}
            </span>
          ))}
          {entry.description && <em className="lesson-video-description">{entry.description}</em>}
          {entry.annotation && (
            <span className="lesson-video-note">
              <strong lang={locale}>{t('introFilmVisual')}</strong> <span>{entry.annotation}</span>
            </span>
          )}
        </p>
      ))}
    </div>
  );

  if (textOnly) return text;
  return (
    <>
      <video
        ref={video}
        className="lesson-video"
        controls
        playsInline
        preload="metadata"
        poster={poster}
        src={src}
        aria-label={title}
      >
        <track ref={captionElement} kind="captions" {...captions} default />
      </video>
      <details className="lesson-video-transcript" onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary id={transcriptId}>{t('introFilmTranscript')}</summary>
        {text}
      </details>
    </>
  );
}
