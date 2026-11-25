import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, copyFile, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { weekTwoIntroFilm } from '../src/curriculum/week-02/intro-films';
import editTimings from '../art/week-two-film/edit-timings.json';

const frameCount = editTimings.reduce((count, shot) => count + shot.frames, 0);
const seconds = frameCount / 24;
const videoPath = resolve('public' + weekTwoIntroFilm.video);
const renderVideo = process.argv.includes('--video');
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
let narrationPath: string | undefined;
let narrationIsReview = false;

if (renderVideo) {
  const manifestPath = 'art/week-two-film/audio/narration-track.json';
  if (!(await Bun.file(manifestPath).exists()))
    throw new Error('Time the approved narration before rendering: bun scripts/time-week-two-voice.ts');
  const narration = await Bun.file(manifestPath).json();
  if (
    narration.version !== 1 ||
    narration.frames !== frameCount ||
    narration.fps !== 24 ||
    narration.sample_rate !== 24000 ||
    narration.seconds !== seconds ||
    typeof narration.voice_path !== 'string'
  )
    throw new Error('Narration selection does not match the film edit. Regenerate the voice timing.');
  narrationIsReview = narration.review === true;
  if (narrationIsReview && !process.argv.includes('--review'))
    throw new Error(
      'The selected audio is a review voice. Use approved CosyVoice recordings, or explicitly render with --review.',
    );
  if (!narrationIsReview && (narration.engine !== 'cosyvoice3' || narration.approved !== true))
    throw new Error('Select an approved CosyVoice narration track before rendering.');
  const script = JSON.stringify(weekTwoIntroFilm.scenes.map(({ id, lines }) => ({ id, lines })));
  if (
    narration.script_sha256 !== digest(script) ||
    narration.edit_timings_sha256 !== digest(await Bun.file('art/week-two-film/edit-timings.json').text()) ||
    narration.captions_sha256 !== digest(await Bun.file('public' + weekTwoIntroFilm.captions).text())
  )
    throw new Error('Script, captions, or edit timing changed after narration assembly. Regenerate timing.');
  narrationPath = resolve(narration.voice_path);
  if (narration.voice_sha256 !== digest(Buffer.from(await Bun.file(narrationPath).arrayBuffer())))
    throw new Error('Selected narration WAV changed after timing. Regenerate the narration assembly.');
  // The offline viewer embeds edit-timings.json. Rebuild it to prevent stale visual cues.
  const artBuild = Bun.spawn(['bun', 'scripts/build-film-art.ts'], { stdout: 'inherit', stderr: 'inherit' });
  if (await artBuild.exited) throw new Error('Film art rebuild failed');
  console.log(`Rendering with ${narration.engine}: ${narrationPath}`);
}

const directory = resolve('art/week-two-film/renders');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://**', (route) => route.abort());
  await page.goto(pathToFileURL(resolve('art/week-two-film/viewer.html')).href);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  const api = 'archiveArt';
  if (renderVideo) {
    const staging = await mkdtemp(resolve(tmpdir(), 'next-move-film-'));
    const video = resolve(staging, 'opening-silent.mp4');
    const encoder = Bun.spawn(
      [
        'ffmpeg',
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-f',
        'image2pipe',
        '-framerate',
        '24',
        '-vcodec',
        'mjpeg',
        '-i',
        'pipe:0',
        '-c:v',
        'libx264',
        '-threads',
        '4',
        '-crf',
        '21',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        video,
      ],
      { stdin: 'pipe', stdout: 'ignore', stderr: 'pipe' },
    );
    const failure = new Response(encoder.stderr).text();
    for (let frame = 0; frame < frameCount; frame++) {
      const url = await page.evaluate(async ({ time, api }) => (window as any)[api].frame(time, 1920, 1080), {
        time: frame / 24,
        api,
      });
      encoder.stdin.write(Buffer.from(url.split(',')[1], 'base64'));
      await encoder.stdin.flush();
      if (frame % 240 === 0)
        console.log('Rendered ' + Math.round(frame / 24) + ' of ' + seconds + ' seconds');
    }
    encoder.stdin.end();
    if (await encoder.exited) throw new Error(await failure);
    const sound = await page.evaluate(async ({ api, seconds }) => (window as any)[api].score(seconds), {
      api,
      seconds,
    });
    const wave = resolve(staging, 'score.wav');
    await writeFile(wave, Buffer.from(sound.data.split(',')[1], 'base64'));
    console.log(JSON.stringify({ score: { peak: sound.peak, rms: sound.rms, seconds: sound.seconds } }));
    const movie = resolve(staging, 'opening.mp4');
    const mux = Bun.spawn(
      [
        'ffmpeg',
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        video,
        '-i',
        wave,
        '-i',
        narrationPath!,
        '-i',
        'public' + weekTwoIntroFilm.captions,
        '-filter_complex',
        '[1:a]volume=0.44[score];[2:a]' +
          (narrationIsReview ? 'highpass=f=75,acompressor=threshold=-18dB:ratio=2' : 'anull') +
          '[voice];[voice][score]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.8:LRA=9[a]',
        '-map',
        '0:v',
        '-map',
        '[a]',
        '-map',
        '3:s',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-b:a',
        '160k',
        '-c:s',
        'mov_text',
        '-metadata:s:s:0',
        'language=eng',
        '-disposition:s:0',
        '0',
        '-movflags',
        '+faststart',
        movie,
      ],
      { stdout: 'inherit', stderr: 'inherit' },
    );
    if (await mux.exited) throw new Error('Film soundtrack mux failed');
    // The native course player supplies WebVTT, while the standalone movie carries its own subtitle stream.
    const webMovie = resolve(staging, 'web.mp4');
    const webMux = Bun.spawn([
      'ffmpeg',
      '-loglevel',
      'error',
      '-y',
      '-i',
      movie,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0',
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      webMovie,
    ]);
    if (await webMux.exited) throw new Error('Web movie remux failed');
    const poster = resolve('public' + weekTwoIntroFilm.poster);
    const thumbnail = Bun.spawn([
      'ffmpeg',
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      String((editTimings[0].cues[0].start + editTimings[0].cues[0].end) / 2),
      '-i',
      movie,
      '-frames:v',
      '1',
      '-vf',
      'scale=1280:-1',
      '-q:v',
      '2',
      poster,
    ]);
    if (await thumbnail.exited) throw new Error('Film poster failed');
    for (const [source, target] of [
      [webMovie, videoPath],
      [movie, resolve(directory, 'week-02-opening.mp4')],
      [wave, resolve(directory, 'week-02-score.wav')],
    ]) {
      await copyFile(source, target + '.tmp');
      await rename(target + '.tmp', target);
    }
    await rm(staging, { recursive: true, force: true });
  } else {
    let elapsed = 0;
    for (const shot of editTimings) {
      const time = (elapsed + shot.frames * 0.75) / 24;
      await page.evaluate(async ({ time, api }) => (window as any)[api].frame(time, 1600, 900), {
        time,
        api,
      });
      await page.locator('canvas').screenshot({ path: resolve(directory, shot.id + '.png') });
      elapsed += shot.frames;
    }
    const fingerprint = (seed: number, extra = {}) =>
      page.evaluate(
        async ({ api, seed, extra }) => (window as any)[api].frame(1.6, 1600, 900, { seed, ...extra }),
        { api, seed, extra },
      );
    const first = await fingerprint(396002);
    if (first !== (await fingerprint(396002))) throw new Error('The same seed/frame changed');
    if (first === (await fingerprint(396003))) throw new Error('Seed has no effect');
    if (first !== (await fingerprint(396002))) throw new Error('Restoring the seed changed the composition');
    for (const extra of [{ grain: 0.1 }, { camera: 0 }, { detail: 0.4 }]) {
      const varied = await fingerprint(396002, extra);
      if (varied === first) throw new Error('An art parameter has no effect');
      await fingerprint(396002, { grain: 0.52, camera: 1, detail: 1 });
    }
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    const seedInput = page.locator('#seed-input');
    await page.getByRole('button', { name: 'Next →', exact: true }).click();
    if ((await seedInput.inputValue()) !== '396003') throw new Error('Next seed failed');
    await page.getByRole('button', { name: '← Prev', exact: true }).click();
    if ((await seedInput.inputValue()) !== '396002') throw new Error('Previous seed failed');
    await seedInput.fill('42');
    await seedInput.press('Tab');
    await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
    await page.getByRole('button', { name: '↻ Random', exact: true }).click();
    if (Number(await seedInput.inputValue()) < 1) throw new Error('Random seed failed');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    if ((await seedInput.inputValue()) !== '396002') throw new Error('Seed reset failed');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
    await (await download).saveAs(resolve(directory, 'export-check.png'));
    console.log('Seed reproducibility, all parameters, navigation, reset, regenerate and PNG export passed');
    await page.screenshot({ path: resolve(directory, 'atelier.png') });
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Film render finished in ' + directory);
} finally {
  await browser.close();
}
