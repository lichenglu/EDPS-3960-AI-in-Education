import { expect, test } from 'bun:test';
import { activeLessonVideoCue, alignLessonVideoCues } from '../src/components/lesson-video-timing';

test('caption order distinguishes repeated spoken lines and supports backward seeking', () => {
  const cues = [
    { startTime: 1, endTime: 2, text: 'Try again.' },
    { startTime: 3, endTime: 4, text: 'Try again.' },
  ];
  expect(alignLessonVideoCues(cues, ['Try again.', 'Try again.'])).toBe(cues);
  expect(activeLessonVideoCue(cues, 3.5)).toBe(1);
  expect(activeLessonVideoCue(cues, 1.5)).toBe(0);
  expect(activeLessonVideoCue(cues, 2)).toBe(-1);
});

test('caption alignment rejects missing, reordered, and overlapping cues', () => {
  const cues = [
    { startTime: 1, endTime: 2, text: 'First line.' },
    { startTime: 3, endTime: 4, text: 'Second line.' },
  ];
  expect(alignLessonVideoCues(cues, ['First line.'])).toBeUndefined();
  expect(alignLessonVideoCues(cues, ['Second line.', 'First line.'])).toBeUndefined();
  expect(
    alignLessonVideoCues(
      [{ ...cues[0], endTime: 4 }, cues[1]],
      cues.map((cue) => cue.text),
    ),
  ).toBeUndefined();
});
