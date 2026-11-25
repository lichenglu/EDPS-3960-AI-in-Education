import { PauseIcon, PlayIcon, Volume2Icon } from 'naive-icons';
import { useEffect, useRef, useState } from 'react';
import { transcript } from '@/curriculum/week-01/cases';
import recording from './sound-desk-recording.json';

export const clipStarts = recording.lineStarts;
type SpeechLine = {
  text: string;
  voiceIndex?: number;
  onProgress?: (fraction: number) => void;
};

let interruptSpeech: (() => void) | undefined;

function speakInBrowser(lines: SpeechLine[], onEnd: () => void, onError: () => void, onInterrupt = onEnd) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return undefined;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices().filter((voice) => voice.localService && voice.lang.startsWith('en'));
  interruptSpeech?.();
  let active = true;

  function release() {
    active = false;
    if (interruptSpeech === interrupt) interruptSpeech = undefined;
  }

  function stop() {
    if (!active) return;
    release();
    synth.cancel();
  }

  function interrupt() {
    stop();
    onInterrupt();
  }

  interruptSpeech = interrupt;

  try {
    if (synth.paused) synth.resume();
    lines.forEach(({ text, voiceIndex = 0, onProgress }, index) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = voices.length ? voices[voiceIndex % voices.length] : undefined;
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? 'en-US';
      utterance.onstart = () => {
        if (active) onProgress?.(0);
      };
      utterance.onboundary = (event) => {
        if (active) onProgress?.(Math.min(0.98, event.charIndex / text.length));
      };
      utterance.onend = () => {
        if (!active || index !== lines.length - 1) return;
        release();
        onEnd();
      };
      utterance.onerror = () => {
        if (!active) return;
        stop();
        onError();
      };
      synth.speak(utterance);
    });
  } catch {
    stop();
    return undefined;
  }
  return { stop, pause: () => synth.pause(), resume: () => synth.resume() };
}

type SpeechPlayback = ReturnType<typeof speakInBrowser>;

export function formatClipTime(seconds: number) {
  const whole = Math.floor(seconds);
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
}

const speechUnavailable = 'Browser voice is unavailable. You can read the text here.';

export function NarrationButton({ text, speaker, mute }: { text: string; speaker: string; mute: boolean }) {
  const playback = useRef<SpeechPlayback>(undefined);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => () => playback.current?.stop(), []);
  useEffect(() => {
    if (mute) {
      playback.current?.stop();
      playback.current = undefined;
      setPlaying(false);
    } else setMessage('');
  }, [mute]);

  function toggle() {
    if (mute) {
      setMessage('Turn sound on in the top bar to listen.');
      return;
    }
    setMessage('');
    if (playing) {
      playback.current?.pause();
      setPlaying(false);
      return;
    }
    if (playback.current) {
      playback.current.resume();
      setPlaying(true);
      return;
    }
    function finish() {
      playback.current = undefined;
      setPlaying(false);
    }
    playback.current = speakInBrowser([{ text }], finish, () => {
      finish();
      setMessage(speechUnavailable);
    });
    if (playback.current) setPlaying(true);
    else setMessage(speechUnavailable);
  }

  return (
    <div className="narration">
      <button className="quiet" type="button" onClick={toggle}>
        {playing ? (
          <>
            <PauseIcon size={16} /> Pause narration
          </>
        ) : (
          <>
            <Volume2Icon size={17} /> Listen to {speaker}
          </>
        )}
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}

const cues = [
  'A student talks about the school garden.',
  'Another asks about flowers.',
  'The teacher introduces herself and asks the group to record details.',
  'The first speaker spells her name and says where and when.',
  'A student mentions a photo.',
  'The teacher adds a private note.',
  'A word is missing near the end.',
];

type Clip = {
  duration: number;
  waveform: readonly number[];
  lines: readonly { start: number; speaker: string; text: string; cue: string }[];
};

const gardenClip: Clip = {
  duration: recording.duration,
  waveform: recording.waveform,
  lines: transcript.map(({ speaker, text }, index) => ({
    start: clipStarts[index],
    speaker,
    text: recording.spokenLines[index] ?? text,
    cue: cues[index],
  })),
};

function lineAt(clip: Clip, seconds: number) {
  const next = clip.lines.findIndex((line) => line.start > seconds);
  return next === -1 ? clip.lines.length - 1 : Math.max(0, next - 1);
}

type ClipMode = 'paused' | 'spoken' | 'silent';

export function ClassroomClip({
  replay,
  mute,
}: {
  replay?: { line: number; request: number };
  mute: boolean;
}) {
  const clip = gardenClip;
  const playback = useRef<SpeechPlayback>(undefined);
  const previousMute = useRef(mute);
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<ClipMode>('paused');
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => () => playback.current?.stop(), []);
  useEffect(() => {
    if (replay) seek(clip.lines[replay.line].start);
  }, [replay]);
  useEffect(() => {
    if (previousMute.current === mute) return;
    previousMute.current = mute;
    if (mode !== 'paused') start(cursor);
  }, [mute]);
  useEffect(() => {
    if (mode !== 'silent') return;
    const clock = window.setInterval(() => setCursor((value) => Math.min(value + 0.1, clip.duration)), 100);
    return () => window.clearInterval(clock);
  }, [mode, clip.duration]);
  useEffect(() => {
    if (mode === 'silent' && cursor >= clip.duration) setMode('paused');
  }, [cursor, mode, clip.duration]);

  function pause() {
    playback.current?.stop();
    playback.current = undefined;
    setMode('paused');
  }

  function start(seconds: number) {
    playback.current?.stop();
    playback.current = undefined;
    setUnavailable(false);
    if (seconds >= clip.duration) seconds = 0;
    setCursor(seconds);
    if (mute) {
      setMode('silent');
      return;
    }

    const line = lineAt(clip, seconds);
    const voices = [...new Set(clip.lines.map(({ speaker }) => speaker))];
    const lines = clip.lines.slice(line).map(({ start, speaker, text }, offset) => {
      const index = line + offset;
      const until = clip.lines[index + 1]?.start ?? clip.duration;
      return {
        text: text.replace('[unclear]', '…'),
        voiceIndex: voices.indexOf(speaker),
        onProgress: (fraction: number) => setCursor(start + (until - start) * fraction),
      };
    });
    function fallback() {
      playback.current = undefined;
      setUnavailable(true);
      setMode('silent');
    }
    playback.current = speakInBrowser(
      lines,
      () => {
        playback.current = undefined;
        setCursor(clip.duration);
        setMode('paused');
      },
      fallback,
      () => {
        playback.current = undefined;
        setMode('paused');
      },
    );
    if (playback.current) setMode('spoken');
    else fallback();
  }

  function seek(seconds: number) {
    if (mode === 'paused' || seconds >= clip.duration) {
      pause();
      setCursor(seconds);
    } else start(seconds);
  }

  const playing = mode !== 'paused';
  const elapsed = formatClipTime(cursor);
  const total = formatClipTime(clip.duration);
  return (
    <div className="audio">
      <div className="audio-toolbar">
        <button type="button" className="quiet" onClick={() => (playing ? pause() : start(cursor))}>
          {playing ? (
            <>
              <PauseIcon size={16} /> Pause clip
            </>
          ) : (
            <>
              <PlayIcon size={16} /> Play clip
            </>
          )}
        </button>
        <output>
          {elapsed} / {total}
        </output>
      </div>
      <div className="wave" aria-hidden>
        <div className="playhead" style={{ left: Math.min(100, (cursor / clip.duration) * 100) + '%' }} />
        {clip.waveform.map((peak, index) => (
          <i
            key={index}
            style={{
              height: 4 + peak * 46 + 'px',
              opacity: index / clip.waveform.length <= cursor / clip.duration ? 1 : 0.47,
            }}
          />
        ))}
      </div>
      <input
        type="range"
        aria-label="Seek the classroom clip"
        aria-valuetext={elapsed + ' of ' + total}
        min={0}
        max={clip.duration}
        step="any"
        value={Math.min(cursor, clip.duration)}
        onChange={(event) => seek(event.target.valueAsNumber)}
      />
      <p className="caption">Clip cue · {clip.lines[lineAt(clip, cursor)].cue}</p>
      {unavailable && (
        <p role="status">Browser voice is unavailable. You can read the clip transcript below.</p>
      )}
      <details className="audio-transcript">
        <summary>Read the clip transcript</summary>
        <ol>
          {clip.lines.map(({ speaker, text, start }) => (
            <li key={start}>
              <span className="time">{formatClipTime(start)}</span> <strong>{speaker}</strong> · {text}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
