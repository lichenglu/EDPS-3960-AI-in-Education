import { expect, test } from '@playwright/test';
import { weekTwoIntroFilm as film } from '../../src/curriculum/week-02/intro-films';

test('I Do plays one continuous, seekable video with synchronized closed captions', async ({
  page,
  request,
}) => {
  await page.goto('/quests/w02');
  const video = page.locator('video');
  await expect(video).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'I Do', level: 2, exact: true })).toBeVisible();
  await expect(page.getByText(film.context, { exact: true })).toBeVisible();
  await expect(page.getByText(film.guidingQuestion, { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Timeline milestones' })).toHaveCount(0);
  const probe = await request.get(film.video, { headers: { Range: 'bytes=0-1' } });
  expect(probe.status()).toBe(206);
  expect(probe.headers()['content-type']).toBe('video/mp4');
  expect((await probe.body()).byteLength).toBe(2);
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThanOrEqual(1);
  expect(await video.evaluate((el: HTMLVideoElement) => el.duration)).toBeCloseTo(90, 1);
  expect(await video.evaluate((el: HTMLVideoElement) => el.paused && el.controls && !el.autoplay)).toBe(true);
  await video.evaluate(async (el: HTMLVideoElement) => {
    el.muted = true;
    await el.play();
  });
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0.15);
  const shotIndex = film.scenes.findIndex((shot) => shot.id === 'clue');
  const cueIndex = film.scenes.slice(0, shotIndex).reduce((sum, shot) => sum + shot.lines.length, 0);
  await video.evaluate((el: HTMLVideoElement, index) => {
    const cue = el.textTracks[0].cues![index];
    el.pause();
    el.currentTime = (cue.startTime + cue.endTime) / 2;
  }, cueIndex);
  await expect
    .poll(() =>
      video.evaluate((el: HTMLVideoElement) => {
        const en = Array.from(el.textTracks).find((track) => track.kind === 'captions');
        return (en?.activeCues?.[0] as VTTCue | undefined)?.text;
      }),
    )
    .toBe(film.scenes[shotIndex].lines[0]);
  const videoWidth = (await video.boundingBox())!.width;
  await page.getByText('Transcript', { exact: true }).click();
  const transcript = page.getByRole('region', { name: 'Transcript', exact: true });
  await expect(transcript).toBeVisible();
  expect((await video.boundingBox())!.width).toBeCloseTo(videoWidth, 0);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 720 });
    const size = await transcript.evaluate((element) => ({
      height: element.clientHeight,
      contentHeight: element.scrollHeight,
      maxHeight: parseFloat(getComputedStyle(element).maxHeight),
      fits: element.scrollWidth <= element.clientWidth,
    }));
    expect(size.height).toBeLessThanOrEqual(Math.ceil(size.maxHeight));
    expect(size.contentHeight).toBeGreaterThan(size.height);
    expect(size.fits).toBe(true);
  }
  await expect(page.getByText(film.scenes[0].description, { exact: true })).toBeVisible();
  await transcript.focus();
  await expect(transcript).toBeFocused();
  await transcript.press('End');
  await expect.poll(() => transcript.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Open the archive' }).click();
  await expect(video).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Timeline milestones' })).toBeVisible();
  await page.getByRole('button', { name: /^I Do\b/ }).click();
  await expect(video).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Timeline milestones' })).toHaveCount(0);
});

test('the transcript follows native cue timing through playback, backward seeks, and captions off', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/quests/w02');
  const video = page.locator('video');
  const lines = film.scenes.flatMap((shot) => [...shot.lines]);
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.textTracks[0]?.cues?.length ?? 0))
    .toBe(lines.length);
  const transcript = page.getByRole('region', { name: 'Transcript', exact: true });
  const current = transcript.locator('.lesson-video-line[aria-current="true"]');
  const toggle = page.getByText('Transcript', { exact: true });
  await expect(transcript).toHaveCount(0);

  async function seek(index: number) {
    await video.evaluate((el: HTMLVideoElement, value) => {
      const cues = el.textTracks[0].cues!;
      const cue = cues[value];
      el.pause();
      el.currentTime = (cue.startTime + cue.endTime) / 2;
    }, index);
  }
  async function expectCurrentInside() {
    await expect
      .poll(() =>
        transcript.evaluate((element) => {
          const line = element.querySelector('[aria-current="true"]');
          if (!line) return false;
          const box = element.getBoundingClientRect();
          const target = line.getBoundingClientRect();
          return target.top >= box.top && target.bottom <= box.bottom;
        }),
      )
      .toBe(true);
  }

  await seek(13);
  await toggle.click();
  await expect(current).toHaveText(lines[13]);
  await expect(current).toHaveAttribute('data-cue-index', '13');
  await expectCurrentInside();
  const pagePosition = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  expect(await transcript.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  // Turning native captions off must not stop transcript timing or turn captions back on.
  const times = await video.evaluate((el: HTMLVideoElement) => {
    const cues = Array.from(el.textTracks[0].cues!);
    el.textTracks[0].mode = 'disabled';
    return cues.map((cue) => ({ start: cue.startTime, end: cue.endTime }));
  });
  for (const index of [19, 0]) {
    await video.evaluate(
      (el: HTMLVideoElement, time) => {
        el.currentTime = time;
      },
      (times[index].start + times[index].end) / 2,
    );
    await expect(current).toHaveAttribute('data-cue-index', String(index));
    await expectCurrentInside();
    expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual(pagePosition);
  }
  expect(await video.evaluate((el: HTMLVideoElement) => el.textTracks[0].mode)).toBe('disabled');
  expect(await transcript.evaluate((element) => element.scrollTop)).toBeLessThan(1);

  await video.evaluate((el: HTMLVideoElement, time) => {
    el.currentTime = time;
  }, times[0].end + 0.1);
  await expect(current).toHaveCount(0);
  await toggle.click();
  await video.evaluate(
    (el: HTMLVideoElement, time) => {
      el.currentTime = time;
    },
    (times[13].start + times[13].end) / 2,
  );
  await toggle.click();
  await expect(current).toHaveAttribute('data-cue-index', '13');
  await expectCurrentInside();

  await video.evaluate(async (el: HTMLVideoElement, time) => {
    el.currentTime = time;
    el.muted = true;
    await el.play();
  }, times[0].end - 0.15);
  await expect(current).toHaveAttribute('data-cue-index', '1');
  await expect(current).toHaveText(lines[1]);
  await expectCurrentInside();
  await video.evaluate((el: HTMLVideoElement) => el.pause());
});

test('text mode delivers the whole introduction at phone width and opens the archive directly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/quests/w02?view=text');
  const intro = page.getByRole('region', { name: film.title, exact: true });
  await expect(page.locator('video')).toHaveCount(0);
  for (const shot of film.scenes) {
    await expect(intro).toContainText(shot.lines.join(' '));
    await expect(intro.getByText(shot.description, { exact: true })).toBeVisible();
    if (shot.annotation) await expect(intro.getByText(shot.annotation, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open the archive' }).click();
  await expect(page.getByRole('heading', { name: '1958', exact: true })).toBeVisible();
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});
