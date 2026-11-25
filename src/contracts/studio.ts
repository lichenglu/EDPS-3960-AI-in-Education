import { weekOneManifest, type StudioMission } from '../curriculum/week-01/manifest.ts';

export type { StudioMission } from '../curriculum/week-01/manifest.ts';
export const studioQuestId = weekOneManifest.id;
export const studioVersion = weekOneManifest.version;
export const studioPath = '/api/v1/studio/' + studioQuestId;
export const studioMissionIds = weekOneManifest.missions;
export const studioPhases = ['run', 'tune', 'audit'] as const;
export type StudioPhase = (typeof studioPhases)[number];
export type StudioArrival = 'ideas' | 'story' | 'controls' | 'done';
export type StudioLessonStep = 'model' | 'practice' | 'transfer';
export type StudioLessonProgress = { checkpoint: StudioLessonStep; introDone: boolean };
export type StudioSoundProgress = StudioLessonProgress & {
  previouslyCompleted: boolean;
  note: string;
  noteSaved: boolean;
  reply: string;
  replySaved: boolean;
};
export type StudioState = {
  arrival: StudioArrival;
  storyFinished?: true;
  activeMission?: StudioMission;
  progress: Partial<Record<StudioMission, StudioPhase[]>>;
  lesson: StudioSoundProgress;
  stations: Partial<Record<Exclude<StudioMission, 'transcript'>, StudioLessonProgress>>;
  work: Partial<Record<StudioMission, Record<string, unknown>>>;
};
export type StudioCheckpoint = { revision: number; state: StudioState | null; lastSaved: string | null };
export type StudioConfig = { requireAccount: boolean; localPreview: boolean };
export type StudioStage = 'i-do' | 'we-do' | 'you-do';
export type StudioSummary = {
  stage: StudioStage | null;
  stages: Record<Exclude<StudioStage, 'you-do'>, 'complete' | 'in-progress' | 'not-started'> & {
    'you-do': 'optional';
  };
  complete: boolean;
  completedMissions: number;
  totalMissions: number;
  lastSaved: string;
};

export function completedStudioMissions(state: StudioState | null) {
  return studioMissionIds.filter(
    (id) =>
      state?.progress[id]?.length === studioPhases.length &&
      (id !== 'transcript' || state.lesson.replySaved || state.lesson.previouslyCompleted),
  );
}
