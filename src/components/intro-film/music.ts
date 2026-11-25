type Bar = {
  bass: number;
  pad: readonly number[];
  keys: readonly (readonly [seconds: number, note: number, emphasis: number])[];
  pulse: readonly number[];
};

const barSeconds = 7.2;
const normalVolume = 0.18;
const duckedVolume = 0.055;

// A quiet D-minor theme in three phrases. The upper notes and the low pulse enter independently.
const bars: readonly Bar[] = [
  {
    bass: 38,
    pad: [50, 57, 64, 65],
    keys: [
      [1.9, 69, 1],
      [4.25, 64, 0.72],
    ],
    pulse: [0.8],
  },
  {
    bass: 34,
    pad: [53, 57, 60, 62],
    keys: [
      [0.9, 65, 0.75],
      [3.65, 69, 0.9],
    ],
    pulse: [1.45, 5.1],
  },
  {
    bass: 41,
    pad: [48, 55, 57, 65],
    keys: [
      [1.25, 67, 0.86],
      [4.7, 60, 0.65],
    ],
    pulse: [0.8],
  },
  { bass: 36, pad: [48, 55, 57, 62], keys: [[2.3, 62, 0.78]], pulse: [1.1, 4.8] },
  {
    bass: 43,
    pad: [50, 58, 62, 69],
    keys: [
      [0.75, 69, 0.8],
      [3.5, 74, 0.93],
    ],
    pulse: [1.1],
  },
  {
    bass: 45,
    pad: [53, 57, 62, 64],
    keys: [
      [1.45, 76, 0.77],
      [4.55, 69, 0.71],
    ],
    pulse: [0.75, 5.4],
  },
  {
    bass: 34,
    pad: [53, 57, 62, 64],
    keys: [
      [1.2, 65, 0.87],
      [3.7, 64, 0.57],
      [5.8, 62, 0.72],
    ],
    pulse: [1.05],
  },
  { bass: 36, pad: [48, 55, 60, 62], keys: [[2.05, 67, 0.83]], pulse: [0.9, 4.6] },
  {
    bass: 38,
    pad: [50, 57, 64, 65],
    keys: [
      [1.1, 69, 0.72],
      [4.05, 76, 0.82],
    ],
    pulse: [0.8],
  },
  {
    bass: 41,
    pad: [48, 55, 57, 65],
    keys: [
      [1.95, 77, 0.72],
      [4.45, 72, 0.62],
    ],
    pulse: [1.05, 4.9],
  },
  {
    bass: 34,
    pad: [53, 57, 62, 65],
    keys: [
      [0.95, 69, 0.78],
      [4.15, 65, 0.66],
    ],
    pulse: [1.15],
  },
  {
    bass: 38,
    pad: [50, 57, 62, 64],
    keys: [
      [1.45, 65, 0.69],
      [4.85, 62, 0.6],
    ],
    pulse: [1.4],
  },
];

const pitch = (note: number) => 440 * 2 ** ((note - 69) / 12);

type Tone = {
  frequency: number;
  type: OscillatorType;
  peak: number;
  start: number;
  attack: number;
  sustain?: number;
  end: number;
};

function createScore(audio: BaseAudioContext, output: AudioNode) {
  const warm = audio.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 1540;
  warm.Q.value = 0.35;
  warm.connect(output);

  // Two filtered reflections leave a short room tail without loading an impulse-response file.
  for (const [seconds, level] of [
    [0.17, 0.11],
    [0.41, 0.07],
  ]) {
    const reflection = audio.createDelay(0.5);
    const levelNode = audio.createGain();
    reflection.delayTime.value = seconds;
    levelNode.gain.value = level;
    warm.connect(reflection);
    reflection.connect(levelNode).connect(output);
  }

  const active = new Map<OscillatorNode, GainNode>();

  function release(tone: OscillatorNode, envelope: GainNode) {
    active.delete(tone);
    tone.disconnect();
    envelope.disconnect();
  }

  function play({ frequency, type, peak, start, attack, sustain = 0, end }: Tone) {
    if (end - start < 0.04) return;
    const tone = audio.createOscillator();
    const envelope = audio.createGain();
    const attackEnd = Math.min(start + attack, end - 0.03);
    const sustainEnd = Math.min(attackEnd + sustain, end - 0.02);
    tone.type = type;
    tone.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(peak, attackEnd);
    if (sustain > 0) envelope.gain.linearRampToValueAtTime(peak * 0.77, sustainEnd);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    tone.connect(envelope).connect(warm);
    active.set(tone, envelope);
    tone.onended = () => release(tone, envelope);
    tone.start(start);
    tone.stop(end);
  }

  function scheduleBar(index: number, time: number, audioReadyAt: number) {
    const bar = bars[index % bars.length];
    for (const [part, note] of bar.pad.entries()) {
      const start = Math.max(time, audioReadyAt) + part * 0.23;
      const frequency = pitch(note);
      play({
        frequency,
        type: 'sine',
        peak: 0.082 - part * 0.009,
        start,
        attack: 1.35 + part * 0.22,
        sustain: 3.4,
        end: time + barSeconds + 1.65 + part * 0.26,
      });
      if (part < 2) {
        play({
          frequency: frequency * 1.997,
          type: 'triangle',
          peak: 0.031,
          start: start + 0.4,
          attack: 2.2,
          sustain: 2.6,
          end: time + barSeconds + 1.3,
        });
      }
    }
    for (const offset of bar.pulse) {
      const start = time + offset;
      if (start < audioReadyAt) continue;
      play({
        frequency: pitch(bar.bass),
        type: 'triangle',
        peak: offset < 2 ? 0.14 : 0.087,
        start,
        attack: 0.5,
        sustain: 0.3,
        end: start + 2.65,
      });
    }
    for (const [offset, note, emphasis] of bar.keys) {
      const start = time + offset;
      if (start < audioReadyAt) continue;
      const frequency = pitch(note);
      play({ frequency, type: 'triangle', peak: 0.18 * emphasis, start, attack: 0.085, end: start + 2.15 });
      play({
        frequency: frequency * 2.005,
        type: 'sine',
        peak: 0.036 * emphasis,
        start: start + 0.017,
        attack: 0.07,
        end: start + 0.78,
      });
    }
  }

  return {
    scheduleBar,
    stop() {
      for (const [tone, envelope] of active) {
        tone.onended = null;
        tone.stop();
        release(tone, envelope);
      }
    },
  };
}

export function createFilmMusic() {
  const audio = new AudioContext();
  const volume = audio.createGain();
  volume.gain.value = 0;
  volume.connect(audio.destination);
  const score = createScore(audio, volume);
  let interval: number | undefined;
  let request = 0;
  let enabled = false;
  let elapsed = 0;
  let origin: number | undefined;
  let nextBar = 0;

  function setDucked(ducked: boolean) {
    if (!enabled) return;
    volume.gain.cancelScheduledValues(audio.currentTime);
    volume.gain.setTargetAtTime(ducked ? duckedVolume : normalVolume, audio.currentTime, 0.09);
  }

  function scheduleAhead() {
    if (origin === undefined) return;
    const now = audio.currentTime;
    nextBar = Math.max(nextBar, Math.floor((now - origin) / barSeconds));
    while (origin + nextBar * barSeconds < now + 0.36) {
      score.scheduleBar(nextBar, origin + nextBar * barSeconds, now + 0.015);
      nextBar++;
    }
  }

  function stop() {
    enabled = false;
    request++;
    window.clearInterval(interval);
    interval = undefined;
    if (origin !== undefined) elapsed = Math.max(elapsed, audio.currentTime - origin);
    origin = undefined;
    volume.gain.cancelScheduledValues(audio.currentTime);
    volume.gain.setValueAtTime(0, audio.currentTime);
    score.stop();
  }

  return {
    setDucked,
    start(ducked: boolean) {
      enabled = true;
      setDucked(ducked);
      if (interval !== undefined) return;
      const generation = ++request;
      void audio
        .resume()
        .then(() => {
          if (request !== generation) return;
          origin = audio.currentTime + 0.03 - elapsed;
          nextBar = Math.floor(elapsed / barSeconds);
          scheduleAhead();
          interval = window.setInterval(scheduleAhead, 220);
        })
        .catch(() => {});
    },
    stop,
    dispose() {
      stop();
      void audio.close().catch(() => {});
    },
  };
}

export async function renderFilmScore(seconds: number): Promise<AudioBuffer> {
  const sampleRate = 44_100;
  const duration = Number.isFinite(seconds) ? Math.max(0.05, seconds) : 0.05;
  const audio = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  const volume = audio.createGain();
  volume.gain.setValueAtTime(normalVolume, 0);
  volume.gain.setValueAtTime(normalVolume, Math.max(0, duration - 2.3));
  volume.gain.linearRampToValueAtTime(0, duration);
  volume.connect(audio.destination);
  const score = createScore(audio, volume);
  for (let index = 0; index * barSeconds < duration; index++) {
    score.scheduleBar(index, index * barSeconds, 0);
  }
  return audio.startRendering();
}
