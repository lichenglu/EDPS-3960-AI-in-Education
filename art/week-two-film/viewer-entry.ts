import type P5 from 'p5';
import { weekTwoIntroFilm } from '../../src/curriculum/week-02/intro-films';
import { drawFilm } from './draw-reading-film';
import { defaultArtParameters, type ArtParameters } from '../../src/components/intro-film/paint';
import { renderFilmScore } from '../../src/components/intro-film/music';

import timings from './edit-timings.json';
const frames = weekTwoIntroFilm.scenes.map((shot, index) => {
  const timed = timings[index];
  if (!timed || timed.id !== shot.id || timed.cues.length !== shot.lines.length)
    throw new Error('Record the current edit before rendering.');
  return { ...shot, duration: timed.frames / 24, cues: timed.cues };
});
const length = frames.reduce((sum, scene) => sum + scene.duration, 0);
let sketch: P5;
let currentTime = 0;
let parameters = { ...defaultArtParameters };
let playing = false;
let previous = performance.now();
let animation = 0;

function drawAt(time: number) {
  let elapsed = 0,
    index = frames.length - 1;
  for (let i = 0; i < frames.length; i++) {
    if (time < elapsed + frames[i].duration) {
      index = i;
      break;
    }
    elapsed += frames[i].duration;
  }
  if (time >= length) elapsed = length - frames.at(-1)!.duration;
  const scene = frames[index];
  const local = Math.max(0, Math.min(scene.duration, time - elapsed));
  drawFilm(sketch, scene, local / scene.duration, parameters, scene);
  const output = document.getElementById('time-value');
  if (output) output.textContent = time.toFixed(1) + ' s';
  const slider = document.getElementById('time') as HTMLInputElement | null;
  if (slider) slider.value = String(time);
}
const api = {
  scenes: frames,
  duration: length,
  async frame(time: number, width = 1600, height = 900, settings: Partial<ArtParameters> = {}) {
    playing = false;
    cancelAnimationFrame(animation);
    parameters = { ...parameters, ...settings };
    currentTime = Math.max(0, Math.min(time, length));
    if (sketch.width !== width || sketch.height !== height) sketch.resizeCanvas(width, height, true);
    await sketch.redraw();
    return (document.querySelector('canvas') as HTMLCanvasElement).toDataURL('image/jpeg', 0.96);
  },
  async score(seconds: number) {
    const buffer = await renderFilmScore(seconds);
    const length = buffer.length,
      bytes = new Uint8Array(44 + length * 4),
      view = new DataView(bytes.buffer);
    const word = (value: string, offset: number) => {
      for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i);
    };
    word('RIFF', 0);
    view.setUint32(4, bytes.length - 8, true);
    word('WAVEfmt ', 8);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    word('data', 36);
    view.setUint32(40, length * 4, true);
    const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
    let peak = 0,
      squares = 0;
    for (let i = 0; i < length; i++)
      for (let channel = 0; channel < 2; channel++) {
        const value = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(44 + i * 4 + channel * 2, Math.round(value * 32767), true);
        peak = Math.max(peak, Math.abs(value));
        squares += value * value;
      }
    const data = await new Promise<string>((resolve) => {
      const file = new FileReader();
      file.onload = () => resolve(file.result as string);
      file.readAsDataURL(new Blob([bytes], { type: 'audio/wav' }));
    });
    return { data, peak, rms: Math.sqrt(squares / (length * 2)), seconds: buffer.duration };
  },
};
(window as unknown as { archiveArt: typeof api }).archiveArt = api;

const host = document.getElementById('canvas-container')!;
host.replaceChildren();
const P5Sketch = (window as unknown as { p5: typeof P5 }).p5;
sketch = new P5Sketch((p) => {
  (p as P5 & { _loadingIndicator?: HTMLElement })._loadingIndicator = document.createElement('span');
  p.setup = () => {
    p.pixelDensity(1);
    p.createCanvas(1600, 900);
    p.noLoop();
    document.body.dataset.ready = 'true';
  };
  p.draw = () => {
    sketch = p;
    drawAt(currentTime);
  };
}, host);

function sync() {
  const input = document.getElementById('seed-input') as HTMLInputElement;
  input.value = String(parameters.seed);
  for (const [key, value] of Object.entries(parameters)) {
    const control = document.getElementById(key) as HTMLInputElement | null;
    if (control) control.value = String(value);
    const output = document.getElementById(key + '-value');
    if (output) output.textContent = String(value);
  }
}
function redraw() {
  sync();
  void sketch.redraw();
}
Object.assign(window, {
  updateSeed() {
    const value = Number((document.getElementById('seed-input') as HTMLInputElement).value);
    if (value > 0) parameters.seed = Math.floor(value);
    redraw();
  },
  previousSeed() {
    parameters.seed = Math.max(1, parameters.seed - 1);
    redraw();
  },
  nextSeed() {
    parameters.seed++;
    redraw();
  },
  randomSeedAndUpdate() {
    parameters.seed = Math.floor(Math.random() * 999999) + 1;
    redraw();
  },
  updateParam(name: keyof ArtParameters | 'time', value: string) {
    if (name === 'time') {
      currentTime = Number(value);
    } else parameters[name] = Number(value);
    redraw();
  },
  resetParameters() {
    parameters = { ...defaultArtParameters };
    currentTime = 0;
    redraw();
  },
  regenerate() {
    redraw();
  },
  exportImage() {
    pSave();
  },
  togglePlayback() {
    playing = !playing;
    previous = performance.now();
    (document.getElementById('play-art') as HTMLButtonElement).textContent = playing
      ? 'Pause film'
      : 'Play film';
    if (playing) {
      if (currentTime >= length) currentTime = 0;
      tick(previous);
    }
  },
});
function pSave() {
  sketch.saveCanvas('water-under-the-door-' + parameters.seed + '-' + currentTime.toFixed(1), 'png');
}
function tick(now: number) {
  if (!playing) return;
  currentTime = Math.min(length, currentTime + (now - previous) / 1000);
  previous = now;
  void sketch.redraw();
  if (currentTime >= length) {
    playing = false;
    document.getElementById('play-art')!.textContent = 'Play film';
  } else animation = requestAnimationFrame(tick);
}
sync();
