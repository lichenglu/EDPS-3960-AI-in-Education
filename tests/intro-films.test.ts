import { expect, test } from 'bun:test';
import editTimings from '../art/week-two-film/edit-timings.json';
import { weekTwoIntroFilm } from '../src/curriculum/week-02/intro-films';

test('one narrated reading story leads into historical inquiry without showing the timeline', () => {
  const { scenes, guidingQuestion } = weekTwoIntroFilm;
  expect(scenes.map((scene) => scene.id)).toEqual([
    'orientation',
    'flood',
    'escape',
    'answer',
    'shutter',
    'model',
    'clue',
    'conversation',
    'archive',
  ]);
  expect(weekTwoIntroFilm.stageTitle).toBe('I Do');
  // A student entering through the film, the page, or the transcript can identify the example.
  expect(weekTwoIntroFilm.context).toContain('Sam');
  expect(weekTwoIntroFilm.context).toContain('Mara');
  expect(guidingQuestion).toContain('Sam');
  expect(scenes[0].lines[0]).toContain('Sam');
  expect(scenes[0].lines.join(' ')).toMatch(/same story/i);
  const conversation = scenes.find((scene) => scene.id === 'conversation')!;
  expect(conversation.lines.at(-1)).toContain('They had to get out before the water rose.');
  for (const id of ['shutter', 'clue', 'conversation']) {
    const shot = scenes.find((scene) => scene.id === id)!;
    expect(shot.annotation.trim().length).toBeGreaterThan(0);
  }
  for (const scene of scenes) {
    expect(scene.lines.length).toBeGreaterThan(0);
    expect(scene.description.length).toBeGreaterThan(25);
  }
  const story = JSON.stringify(scenes);
  expect(story).toContain('Water crept under the door.');
  expect(story).not.toMatch(/algebra|[12][09]\d\d|timeline|[+×=]/i);
});

test('the recorded edit lasts ninety seconds and every spoken cue fits its shot', () => {
  expect(editTimings.reduce((total, shot) => total + shot.frames, 0) / 24).toBeCloseTo(90, 1);
  expect(editTimings.map((shot) => shot.id)).toEqual(weekTwoIntroFilm.scenes.map((shot) => shot.id));
  for (const [index, shot] of editTimings.entries()) {
    expect(shot.cues.length).toBe(weekTwoIntroFilm.scenes[index].lines.length);
    let priorEnd = 0;
    for (const cue of shot.cues) {
      expect(cue.start).toBeGreaterThanOrEqual(priorEnd);
      expect(cue.end).toBeGreaterThan(cue.start);
      expect(cue.end).toBeLessThanOrEqual(shot.frames / 24);
      priorEnd = cue.end;
    }
  }
});

test('every closed caption matches the words and onset of its recorded cue', async () => {
  const captions = await Bun.file('public' + weekTwoIntroFilm.captions).text();
  const [header, ...blocks] = captions.trim().split(/\r?\n\r?\n/);
  expect(header).toBe('WEBVTT');
  let shotStart = 0;
  let index = 0;
  for (const [i, shot] of editTimings.entries()) {
    for (const [j, cue] of shot.cues.entries()) {
      const [time, text] = blocks[index++].split(/\r?\n/);
      const onset = new Date(Math.round((shotStart + cue.start) * 1000)).toISOString().slice(11, 23);
      expect(time.startsWith(onset + ' --> ')).toBe(true);
      expect(text).toBe(weekTwoIntroFilm.scenes[i].lines[j]);
    }
    shotStart += shot.frames / 24;
  }
  expect(index).toBe(blocks.length);
});
