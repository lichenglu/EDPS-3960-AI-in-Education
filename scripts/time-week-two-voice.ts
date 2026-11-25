// Time the film to approved recordings; the macOS review voice is an explicit opt-in.
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { weekTwoIntroFilm as film } from '../src/curriculum/week-02/intro-films';

const art = 'art/week-two-film';
const sampleRate = 24000;
const fps = 24;
const samplesPerFrame = sampleRate / fps;
const targetFrames = 90 * fps;
const arguments_ = process.argv.slice(2);
const review = arguments_.includes('--review');
const directoryIndex = arguments_.indexOf('--narration-dir');
if (arguments_.includes('--help')) {
  console.log('Usage: bun scripts/time-week-two-voice.ts [--narration-dir PATH | --review]');
  console.log('Default: approved CosyVoice clips in art/week-two-film/audio/cosyvoice3/.');
  process.exit(0);
}
for (let index = 0; index < arguments_.length; index++) {
  if (arguments_[index] === '--review') continue;
  if (arguments_[index] === '--narration-dir' && arguments_[index + 1]) {
    index++;
    continue;
  }
  throw new Error('Unknown or incomplete option: ' + arguments_[index]);
}
if (review && directoryIndex >= 0) throw new Error('Choose approved recordings or --review.');
const narrationDirectory = resolve(
  directoryIndex >= 0 ? arguments_[directoryIndex + 1] : art + '/audio/cosyvoice3',
);
const temporary = await mkdtemp(join(tmpdir(), 'reading-film-voice-'));
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const scriptHash = hash(JSON.stringify(film.scenes.map(({ id, lines }) => ({ id, lines }))));
const clipId = (scene: string, index: number) => `w02-${scene}-${String(index + 1).padStart(2, '0')}`;

type RecordedClip = { id: string; sha256: string; text_sha256?: string; text?: string };
type Completion = {
  status?: string;
  engine?: string;
  approved?: boolean;
  production_approved?: boolean;
  clips?: RecordedClip[];
  model?: unknown;
  instruct?: string;
  voice_settings?: unknown;
  voice_settings_sha256?: string;
  settings?: unknown;
  job_id?: string;
  batch_id?: string;
};
let completion: Completion | undefined;
let completionHash: string | undefined;
const recorded = new Map<string, RecordedClip>();
const sourceClips: { id: string; text_sha256: string; sha256: string; samples: number }[] = [];
const assemblyAdjustments: {
  clip_id: string;
  kind: string;
  curve: string;
  samples: number;
  seconds: number;
  start_sample: number;
  end_sample: number;
  source_last_sample: number;
  threshold_full_scale: number;
}[] = [];

function timestamp(samples: number) {
  return new Date(Math.round((samples * 1000) / sampleRate)).toISOString().slice(11, 23);
}
async function run(command: string[]) {
  const job = Bun.spawn(command, { stdout: 'ignore', stderr: 'inherit' });
  if ((await job.exited) !== 0) throw new Error(command[0] + ' failed');
}
async function atomicWrite(path: string, contents: string | Buffer) {
  await mkdir(dirname(path), { recursive: true });
  const pending = `${path}.tmp-${process.pid}`;
  await Bun.write(pending, contents);
  await rename(pending, path);
}
function pcmFromWave(wave: Buffer, id: string) {
  if (wave.toString('ascii', 0, 4) !== 'RIFF' || wave.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error('Expected a RIFF WAV recording for ' + id);
  let format = false;
  let pcm: Buffer | undefined;
  for (let offset = 12; offset + 8 <= wave.length;) {
    const chunk = wave.toString('ascii', offset, offset + 4);
    const size = wave.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > wave.length) throw new Error('Truncated WAV recording for ' + id);
    if (chunk === 'fmt ') {
      if (
        size < 16 ||
        wave.readUInt16LE(start) !== 1 ||
        wave.readUInt16LE(start + 2) !== 1 ||
        wave.readUInt32LE(start + 4) !== sampleRate ||
        wave.readUInt16LE(start + 12) !== 2 ||
        wave.readUInt16LE(start + 14) !== 16
      )
        throw new Error('Narration must be 24 kHz mono PCM16 WAV: ' + id);
      format = true;
    }
    if (chunk === 'data') {
      if (pcm) throw new Error('Multiple audio data chunks for ' + id);
      pcm = wave.subarray(start, start + size);
    }
    offset = start + size + (size % 2);
  }
  if (!format || !pcm || pcm.length < sampleRate / 3 || pcm.length % 2)
    throw new Error('Missing or invalid speech recording for ' + id);
  let audible = false;
  for (let offset = 0; offset < pcm.length; offset += 2) {
    if (pcm.readInt16LE(offset) !== 0) {
      audible = true;
      break;
    }
  }
  if (!audible) throw new Error('Silent narration clip: ' + id);
  return pcm;
}
async function approvedRecording(line: string, id: string) {
  const record = recorded.get(id);
  if (!record) throw new Error('Approved narration metadata is missing ' + id);
  if (record.text_sha256 !== hash(line) && record.text !== line)
    throw new Error('Narration text differs from the current authored line: ' + id);
  const wave = Buffer.from(await Bun.file(join(narrationDirectory, id + '.wav')).arrayBuffer());
  if (hash(wave) !== record.sha256) throw new Error('Narration WAV hash mismatch: ' + id);
  const pcm = pcmFromWave(wave, id);
  sourceClips.push({ id, text_sha256: hash(line), sha256: record.sha256, samples: pcm.length / 2 });
  return pcm;
}
async function reviewRecording(line: string, id: string) {
  const aiff = join(temporary, 'line.aiff');
  const raw = join(temporary, 'line.pcm');
  await run(['say', '-v', 'Samantha', '-r', '138', '-o', aiff, line]);
  await run([
    'ffmpeg',
    '-loglevel',
    'error',
    '-y',
    '-i',
    aiff,
    '-af',
    'silenceremove=start_periods=1:start_threshold=-52dB,areverse,silenceremove=start_periods=1:start_threshold=-52dB,areverse,atempo=0.85',
    '-ar',
    String(sampleRate),
    '-ac',
    '1',
    '-f',
    's16le',
    raw,
  ]);
  const sound = Buffer.from(await Bun.file(raw).arrayBuffer());
  if (sound.length < sampleRate / 3) throw new Error('Local voice returned no speech for ' + line);
  sourceClips.push({ id, text_sha256: hash(line), sha256: hash(sound), samples: sound.length / 2 });
  return sound;
}
function assemblyPcm(sound: Buffer, id: string, onset: number) {
  const lastSample = sound.readInt16LE(sound.length - 2);
  if (review || Math.abs(lastSample) / 32768 <= 0.03) return sound;
  // Smooth an abrupt endpoint in the assembled master; preserve the source recording.
  const samples = Math.min(Math.round(sampleRate * 0.005), sound.length / 2);
  const output = Buffer.from(sound);
  const start = sound.length / 2 - samples;
  for (let index = 0; index < samples; index++) {
    const gain = (1 + Math.cos((Math.PI * index) / (samples - 1))) / 2;
    output.writeInt16LE(Math.round(sound.readInt16LE((start + index) * 2) * gain), (start + index) * 2);
  }
  assemblyAdjustments.push({
    clip_id: id,
    kind: 'end-fade',
    curve: 'raised-cosine',
    samples,
    seconds: samples / sampleRate,
    start_sample: onset + start,
    end_sample: onset + sound.length / 2,
    source_last_sample: lastSample,
    threshold_full_scale: 0.03,
  });
  return output;
}

try {
  if (!review) {
    const metadata = join(narrationDirectory, 'complete.json');
    if (!(await Bun.file(metadata).exists()))
      throw new Error(
        'Approved CosyVoice narration is missing. Supply --narration-dir PATH or explicitly use --review.',
      );
    const contents = await Bun.file(metadata).text();
    completion = JSON.parse(contents) as Completion;
    if (
      completion.status !== 'complete' ||
      completion.engine !== 'cosyvoice3' ||
      (completion.approved !== true && completion.production_approved !== true) ||
      !Array.isArray(completion.clips)
    )
      throw new Error('A completed, approved CosyVoice production batch is required.');
    completionHash = hash(contents);
    for (const clip of completion.clips) {
      if (
        !clip ||
        typeof clip.id !== 'string' ||
        !/^[a-f0-9]{64}$/.test(clip.sha256) ||
        recorded.has(clip.id)
      )
        throw new Error('Invalid or duplicate narration clip metadata.');
      recorded.set(clip.id, clip);
    }
    const expected = film.scenes.flatMap((shot) => shot.lines.map((_, index) => clipId(shot.id, index)));
    if (recorded.size !== expected.length || expected.some((id) => !recorded.has(id)))
      throw new Error('The approved narration clip list does not match the current Week 2 film.');
  }
  const shots = [];
  for (const shot of film.scenes) {
    const lines: Buffer[] = [];
    for (const [index, line] of shot.lines.entries()) {
      const id = clipId(shot.id, index);
      lines.push(await (review ? reviewRecording(line, id) : approvedRecording(line, id)));
    }
    const speech = lines.reduce((sum, pcm) => sum + pcm.length / 2, 0);
    const lead = Math.round(sampleRate * (shot.id === 'orientation' ? 0.85 : 0.38));
    const gap = Math.round(sampleRate * 0.52);
    const minimumHold = Math.round(sampleRate * (shot.annotation ? 1.4 : 0.85));
    const minimumFrames = Math.ceil(
      (lead + speech + (lines.length - 1) * gap + minimumHold) / samplesPerFrame,
    );
    shots.push({ shot, lines, minimumFrames, lead, gap, weight: shot.annotation ? 1.8 : 1 });
  }
  const extendBy = targetFrames - shots.reduce((sum, s) => sum + s.minimumFrames, 0);
  if (extendBy < 0)
    throw new Error(
      'The recorded narration and minimum reading holds exceed the 90-second cut by ' +
        (-extendBy / fps).toFixed(2) +
        ' seconds. No speech was removed or accelerated; review the recording and edit timing together.',
    );
  const weightTotal = shots.reduce((sum, s) => sum + s.weight, 0);
  let weight = 0,
    cursor = 0;
  const track: Buffer[] = [];
  const captions = ['WEBVTT', ''];
  const timings = [];
  function silence(samples: number) {
    if (samples < 0 || !Number.isInteger(samples)) throw new Error('Invalid reading hold.');
    track.push(Buffer.alloc(samples * 2));
    cursor += samples;
  }
  for (const { shot, lines, minimumFrames, lead, gap, weight: share } of shots) {
    const allottedBefore = Math.round((extendBy * weight) / weightTotal);
    weight += share;
    const frames = minimumFrames + Math.round((extendBy * weight) / weightTotal) - allottedBefore;
    const start = cursor;
    const cues = [];
    silence(lead);
    for (const [index, sound] of lines.entries()) {
      if (index > 0) silence(gap);
      const onset = cursor;
      track.push(assemblyPcm(sound, clipId(shot.id, index), onset));
      cursor += sound.length / 2;
      cues.push({ start: (onset - start) / sampleRate, end: (cursor - start) / sampleRate });
      captions.push(
        timestamp(onset) + ' --> ' + timestamp(cursor + 0.22 * sampleRate),
        shot.lines[index],
        '',
      );
    }
    const hold = start + frames * samplesPerFrame - cursor;
    console.log(
      shot.id,
      (frames / fps).toFixed(2) + 's shot,',
      (hold / sampleRate).toFixed(2) + 's reading hold',
    );
    silence(hold);
    timings.push({ id: shot.id, frames, cues });
  }
  if (cursor !== targetFrames * samplesPerFrame)
    throw new Error('Film soundtrack is not exactly 90 seconds.');
  const joined = join(temporary, 'voice.pcm');
  await Bun.write(joined, Buffer.concat(track));
  const selectedVoice = art + '/audio/' + (review ? 'review-voice.wav' : 'cosyvoice3-voice.wav');
  const pendingVoice = join(temporary, 'voice.wav');
  await run([
    'ffmpeg',
    '-loglevel',
    'error',
    '-y',
    '-f',
    's16le',
    '-ar',
    String(sampleRate),
    '-ac',
    '1',
    '-i',
    joined,
    pendingVoice,
  ]);
  const wav = Buffer.from(await Bun.file(pendingVoice).arrayBuffer());
  const timingJson = JSON.stringify(timings, null, 2) + '\n';
  const captionText = captions.join('\n') + '\n';
  const manifest = {
    version: 1,
    engine: review ? 'macos-samantha-review' : 'cosyvoice3',
    approved: !review,
    review,
    voice_path: selectedVoice,
    voice_sha256: hash(wav),
    sample_rate: sampleRate,
    fps,
    frames: targetFrames,
    seconds: cursor / sampleRate,
    script_sha256: scriptHash,
    edit_timings_sha256: hash(timingJson),
    captions_sha256: hash(captionText),
    source_metadata_sha256: completionHash,
    source_directory: review ? undefined : narrationDirectory,
    source_job_id: completion?.job_id,
    source_batch_id: completion?.batch_id,
    model: completion?.model,
    settings: completion?.voice_settings ?? completion?.settings,
    voice_settings_sha256: completion?.voice_settings_sha256,
    clips: sourceClips,
    assembly_adjustments: assemblyAdjustments,
  };
  await atomicWrite(selectedVoice, wav);
  await atomicWrite(art + '/edit-timings.json', timingJson);
  await atomicWrite('public' + film.captions, captionText);
  // This commit marker is written last; the renderer verifies all selected artifacts.
  await atomicWrite(art + '/audio/narration-track.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `Timed ${sourceClips.length} ${review ? 'review' : 'CosyVoice'} lines into ${cursor / sampleRate}s.`,
  );
  console.log('Run bun scripts/build-film-art.ts before rendering the newly timed frames.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
