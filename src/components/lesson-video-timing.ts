export type LessonVideoCue = {
  startTime: number;
  endTime: number;
  text: string;
};

/** Generated captions contain exactly one cue per authored line, in the same order. */
export function alignLessonVideoCues(
  cues: readonly LessonVideoCue[],
  lines: readonly string[],
): readonly LessonVideoCue[] | undefined {
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
  if (
    cues.length !== lines.length ||
    cues.some(
      (cue, index) =>
        normalize(cue.text) !== normalize(lines[index]) ||
        !Number.isFinite(cue.startTime) ||
        !Number.isFinite(cue.endTime) ||
        cue.startTime < 0 ||
        cue.endTime <= cue.startTime ||
        (index > 0 && cue.startTime < cues[index - 1].endTime),
    )
  )
    return;
  return cues;
}

export function activeLessonVideoCue(cues: readonly LessonVideoCue[], time: number): number {
  return cues.findIndex((cue) => cue.startTime <= time && time < cue.endTime);
}
