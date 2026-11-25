import {
  completedStudioMissions,
  studioMissionIds,
  studioPhases,
  studioQuestId,
  studioVersion,
  type StudioCheckpoint,
  type StudioLessonProgress,
  type StudioState,
  type StudioSummary,
} from '../../contracts/studio.ts';
import { previousStudioMission, type StudioMission } from '../../curriculum/week-01/manifest.ts';
import type { Database, Queries } from '../database.ts';
import { isObject, reject } from '../http.ts';
import type { StudioEvent } from '../telemetry.ts';

const emptyCheckpoint: StudioCheckpoint = { revision: 0, state: null, lastSaved: null };
const invalid = () => reject(422, 'This studio checkpoint is invalid.', 'invalid-studio-checkpoint');
const bool = (value: unknown) => typeof value === 'boolean';
const shortText = (value: unknown) => typeof value === 'string' && value.length <= 800;
const integer = (max: number) => (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
const array =
  (check: (value: unknown) => boolean, max = 20) =>
  (value: unknown) =>
    Array.isArray(value) && value.length <= max && value.every(check);
const strings = array(shortText);
const indexMap = (check: (value: unknown) => boolean, max: number) => (value: unknown) =>
  isObject(value) &&
  Object.entries(value).every(([key, entry]) => /^\d{1,2}$/.test(key) && Number(key) <= max && check(entry));
const flags = (...names: string[]) => Object.fromEntries(names.map((name) => [name, bool]));
const workRules = {
  transcript: {
    ...flags(
      'ran',
      'diarize',
      'uncertainty',
      'train',
      'local',
      'chart',
      'flagged',
      'auditTried',
      'auditChecked',
    ),
    verified: array(integer(2), 3),
    words: strings,
    accuracy: integer(100),
    revision: strings,
    redacted: strings,
  },
  reading: {
    ...flags('ran', 'matchTried', 'preview', 'badges', 'gap', 'override'),
    flags: array(integer(7), 8),
    fields: strings,
    reasons: strings,
    score: integer(8),
  },
  tickets: {
    ...flags('ran', 'grid', 'draft'),
    verified: indexMap(shortText, 11),
    training: indexMap(shortText, 19),
    score: integer(100),
    results: strings,
    flags: strings,
  },
  hints: {
    ...flags('replay', 'risk', 'disclosure', 'handoff'),
    chat: array(
      (value) =>
        isObject(value) && Object.keys(value).length === 2 && shortText(value.text) && shortText(value.reply),
    ),
    flags: array(integer(19)),
    rules: strings,
    custom: shortText,
    tested: array(bool, 4),
  },
  toolkit: {
    ...flags('simulationTried'),
    chosen: array(integer(4), 3),
    settings: indexMap(strings, 4),
    opened: array(integer(4), 5),
    flags: array(integer(4), 5),
    simulated: array(integer(100), 4),
  },
} satisfies Record<string, Record<string, (value: unknown) => boolean>>;

function readLesson(value: unknown): StudioLessonProgress {
  if (
    !isObject(value) ||
    (value.checkpoint !== 'model' && value.checkpoint !== 'practice' && value.checkpoint !== 'transfer') ||
    typeof value.introDone !== 'boolean' ||
    (!value.introDone && value.checkpoint !== 'model')
  )
    return invalid();
  return { checkpoint: value.checkpoint, introDone: value.introDone };
}

function readState(value: unknown): StudioState {
  if (
    !isObject(value) ||
    (value.arrival !== 'ideas' &&
      value.arrival !== 'story' &&
      value.arrival !== 'controls' &&
      value.arrival !== 'done') ||
    !isObject(value.lesson) ||
    !isObject(value.progress) ||
    !isObject(value.stations) ||
    !isObject(value.work)
  )
    return invalid();
  const { note, reply, noteSaved, replySaved } = value.lesson;
  if (
    typeof note !== 'string' ||
    note.length > 800 ||
    typeof reply !== 'string' ||
    reply.length > 800 ||
    typeof noteSaved !== 'boolean' ||
    typeof replySaved !== 'boolean' ||
    (noteSaved && !note.trim()) ||
    (replySaved && (!noteSaved || !reply.trim()))
  )
    return invalid();
  const state: StudioState = {
    arrival: value.arrival,
    progress: {},
    stations: {},
    work: {},
    lesson: {
      ...readLesson(value.lesson),
      previouslyCompleted: false,
      note: noteSaved ? note : '',
      reply: replySaved ? reply : '',
      noteSaved,
      replySaved,
    },
  };
  for (const id of studioMissionIds) {
    const earned = value.progress[id];
    if (earned !== undefined) {
      if (
        !Array.isArray(earned) ||
        earned.length > studioPhases.length ||
        earned.some((phase, index) => phase !== studioPhases[index])
      )
        return invalid();
      state.progress[id] = earned;
    }
    if (id !== 'transcript' && value.stations[id] !== undefined)
      state.stations[id] = readLesson(value.stations[id]);
    const work = value.work[id];
    if (work !== undefined) {
      if (!isObject(work)) return invalid();
      const rules: Record<string, (entry: unknown) => boolean> = workRules[id];
      if (Object.entries(work).some(([key, entry]) => !Object.hasOwn(rules, key) || !rules[key](entry)))
        return invalid();
      state.work[id] = work;
    }
  }
  if (value.storyFinished !== undefined) {
    if (value.storyFinished !== true || (state.arrival !== 'controls' && state.arrival !== 'done'))
      return invalid();
    state.storyFinished = true;
  }
  if (value.activeMission !== undefined) {
    const active = studioMissionIds.find((id) => id === value.activeMission);
    if (!active) return invalid();
    state.activeMission = active;
  }
  const completed = completedStudioMissions(state);
  for (const id of studioMissionIds) {
    const lesson = id === 'transcript' ? state.lesson : state.stations[id];
    if (
      (state.progress[id]?.length && !lesson?.introDone) ||
      (lesson?.checkpoint === 'transfer' && !completed.includes(id))
    )
      return invalid();
  }
  return state;
}

function started(state: StudioState | null, id: StudioMission) {
  if (!state) return false;
  const lesson = id === 'transcript' ? state.lesson : state.stations[id];
  return lesson?.introDone || Boolean(state.work[id]) || state.activeMission === id;
}

function summarizeStudio(state: StudioState, lastSaved: string): StudioSummary {
  const modeled = studioMissionIds.every((id) =>
    id === 'transcript' ? state.lesson.introDone : state.stations[id]?.introDone,
  );
  const completedMissions = completedStudioMissions(state).length;
  const complete = completedMissions === studioMissionIds.length;
  const practicing =
    state.lesson.introDone || Object.values(state.stations).some((lesson) => lesson.introDone);
  return {
    stage: complete ? null : practicing ? 'we-do' : 'i-do',
    stages: {
      'i-do': modeled ? 'complete' : 'in-progress',
      'we-do': complete ? 'complete' : practicing ? 'in-progress' : 'not-started',
      'you-do': 'optional',
    },
    complete,
    completedMissions,
    totalMissions: studioMissionIds.length,
    lastSaved,
  };
}

export function studioStore(db: Database) {
  async function read(account: string, connection: Queries = db): Promise<StudioCheckpoint> {
    const row = await connection
      .query<{ state: string; revision: number; lastSaved: string }>(
        `
      SELECT state, revision, last_saved AS "lastSaved" FROM progress
      WHERE account_id = ? AND quest_id = ? AND quest_version = ?
    `,
      )
      .get(account, studioQuestId, studioVersion);
    return row ? { ...row, state: JSON.parse(row.state) } : emptyCheckpoint;
  }

  async function save(account: string, revision: unknown, value: unknown, version: unknown) {
    if (version !== studioVersion)
      reject(409, 'This week changed. Reload the saved checkpoint.', 'stale-content-version');
    if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0)
      reject(400, 'The checkpoint revision is invalid.');
    const state = readState(value);
    return db.transaction('studio:' + studioQuestId + ':' + account, async (tx) => {
      const previous = await read(account, tx);
      const events: StudioEvent[] = [];
      const serialized = JSON.stringify(state);
      if (serialized === JSON.stringify(previous.state)) return { checkpoint: previous, events };
      if (
        previous.revision !== revision ||
        studioMissionIds.some(
          (id) => (previous.state?.progress[id]?.length ?? 0) > (state.progress[id]?.length ?? 0),
        ) ||
        completedStudioMissions(previous.state).some((id) => !completedStudioMissions(state).includes(id))
      )
        reject(409, 'A newer checkpoint is saved. Reload it before continuing.', 'stale-revision');
      const completed = completedStudioMissions(state);
      for (const id of studioMissionIds) {
        const prerequisite = previousStudioMission(id);
        // Learners can revisit a mission they already started before an order edit.
        if (
          prerequisite &&
          started(state, id) &&
          !started(previous.state, id) &&
          !completed.includes(prerequisite)
        )
          return invalid();
      }
      const lastSaved = new Date().toISOString();
      const summary = summarizeStudio(state, lastSaved);
      const checkpoint = { state, lastSaved, revision: revision + 1 };
      await tx.run(
        `
        INSERT INTO progress (account_id, quest_id, quest_version, revision, state, stage_status, last_saved)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (account_id, quest_id, quest_version) DO UPDATE SET revision = excluded.revision,
          state = excluded.state, stage_status = excluded.stage_status, last_saved = excluded.last_saved
      `,
        account,
        studioQuestId,
        studioVersion,
        checkpoint.revision,
        serialized,
        JSON.stringify(summary),
        lastSaved,
      );
      if (!previous.revision) events.push({ name: 'week_started' });
      const completedBefore = completedStudioMissions(previous.state);
      for (const id of completed)
        if (!completedBefore.includes(id)) events.push({ name: 'mission_completed', mission: id });
      if (summary.complete && completedBefore.length < summary.totalMissions)
        events.push({ name: 'week_completed' });
      return { checkpoint, events };
    });
  }
  return { read, save };
}
