import { expect, test } from 'bun:test';
import { courseSequence, syllabus } from '../src/curriculum/course-manifest';
import { quests } from '../src/curriculum';
import { courseCast } from '../src/curriculum/characters';
import { weekOneManifest } from '../src/curriculum/week-01/manifest';
import { missions } from '../src/curriculum/week-01/cases';
import { openingScenes, storyScenes } from '../src/curriculum/week-01/story';
import {
  ideaReferences,
  lessonReadings,
  lessonVideos,
  studioReferences,
} from '../src/curriculum/week-01/references';
import { studioQuestId, studioVersion, type StudioState, studioMissionIds } from '../src/contracts/studio';
import { createDatabase } from '../src/server/database';
import { studioStore } from '../src/server/progress/studio';
import { desks, getGuide, guest } from '../src/features/quests/week-one/studio/studio-layout';

test('week, station and story order reference stable content IDs exactly once', () => {
  expect(Object.keys(syllabus).sort()).toEqual([...courseSequence].sort());
  expect(Object.keys(quests)).toEqual([...courseSequence]);
  for (const id of courseSequence) expect(quests[id].number).toBe(Number(id.slice(1)));
  expect(Object.keys(missions).sort()).toEqual([...weekOneManifest.missions].sort());
  expect(studioMissionIds).toBe(weekOneManifest.missions);
  expect(desks.map((desk) => desk.id)).toEqual([...studioMissionIds]);
  expect(Object.keys(storyScenes).sort()).toEqual([...weekOneManifest.opening].sort());
  expect(openingScenes).toEqual(weekOneManifest.opening.map((id) => storyScenes[id]));
  expect(openingScenes.filter((scene) => 'demo' in scene)).toHaveLength(1);
});

test('studio guides and reference metadata resolve from the course content files', () => {
  expect(getGuide('transcript').name).toBe(courseCast.chenglu.name);
  expect(getGuide('hints').name).toBe(courseCast.guimin.name);
  expect(guest.name).toBe(courseCast.gokhan.name);
  expect(guest.greeting).toContain(getGuide(studioMissionIds[0]).name);
  for (const id of studioMissionIds) {
    expect(new URL(ideaReferences[id].url).protocol).toBe('https:');
    const { youTubeId, startSeconds, endSeconds } = lessonVideos[id];
    expect(youTubeId).toMatch(/^[\w-]{11}$/);
    expect(endSeconds - startSeconds).toBeGreaterThan(0);
    expect(endSeconds - startSeconds).toBeLessThanOrEqual(600);
  }
  for (const reference of [...Object.values(studioReferences), ...Object.values(lessonReadings)]) {
    expect(new URL(reference.url).protocol).toBe('https:');
  }
});

test('a learner may resume a mission saved before its prerequisite changed', async () => {
  const db = createDatabase(':memory:');
  try {
    const checkpoint: StudioState = {
      arrival: 'done',
      activeMission: 'reading',
      stations: {},
      lesson: {
        checkpoint: 'model',
        introDone: false,
        previouslyCompleted: false,
        note: '',
        reply: '',
        noteSaved: false,
        replySaved: false,
      },
      progress: {},
      work: {},
    };
    await db.run(
      'INSERT INTO progress VALUES (?, ?, ?, ?, ?, ?, ?)',
      'demo-1',
      studioQuestId,
      studioVersion,
      1,
      JSON.stringify(checkpoint),
      '{}',
      '2026-01-01T00:00:00.000Z',
    );
    const saved = await studioStore(db).save(
      'demo-1',
      1,
      {
        ...checkpoint,
        stations: { reading: { introDone: true, checkpoint: 'practice' } },
      },
      studioVersion,
    );
    expect(saved.checkpoint.revision).toBe(2);
    expect(saved.checkpoint.state?.stations.reading?.checkpoint).toBe('practice');
  } finally {
    await db.close();
  }
});
