import { expect, test } from 'bun:test';
import { videoRange } from '../src/server/assets';

test('the course host supports initial, suffix, open-ended and unsatisfiable video ranges', () => {
  expect(videoRange('bytes=0-1', 10)).toEqual([0, 1]);
  expect(videoRange('bytes=3-', 10)).toEqual([3, 9]);
  expect(videoRange('bytes=-3', 10)).toEqual([7, 9]);
  expect(videoRange('bytes=8-25', 10)).toEqual([8, 9]);
  for (const range of ['bytes=20-', 'bytes=8-1', 'bytes=-0', 'bytes=-']) {
    expect(videoRange(range, 10)).toBeNull();
  }
});
