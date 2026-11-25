import type { StudioPhase as Stage } from '@/contracts/studio';

export type LessonCheckpoint = 'model' | 'practice' | 'transfer';

export type SoundLesson = {
  checkpoint: LessonCheckpoint;
  introDone: boolean;
  previouslyCompleted: boolean;
  note: string;
  noteSaved: boolean;
  reply: string;
  replySaved: boolean;
};

export type LegacySoundLesson = Omit<SoundLesson, 'introDone'> & {
  modeled: Stage[];
  firstAttempt?: unknown;
};

export function newSoundLesson(): SoundLesson {
  return {
    checkpoint: 'model',
    introDone: false,
    previouslyCompleted: false,
    note: '',
    noteSaved: false,
    reply: '',
    replySaved: false,
  };
}

export function migrateSoundLesson(legacy: LegacySoundLesson | undefined, earned: Stage[]): SoundLesson {
  if (!legacy) return { ...newSoundLesson(), previouslyCompleted: earned.length === 3 };
  const { checkpoint, modeled, previouslyCompleted, firstAttempt, note, noteSaved, reply, replySaved } =
    legacy;
  return {
    checkpoint,
    introDone: checkpoint !== 'model' || modeled.length === 3,
    previouslyCompleted: previouslyCompleted || Boolean(firstAttempt),
    note,
    noteSaved,
    reply,
    replySaved,
  };
}

export function finishedGuidedPractice(earned: Stage[], lesson: SoundLesson) {
  return earned.length === 3 && lesson.replySaved;
}
