import type { Progress } from '@/game/quest-state';
import { api } from '@/lib/api-client';

export type RecordState = {
  revision: number;
  state: Progress | null;
  unlocked?: { feedback: string };
  lastSaved: string | null;
};

const endpoint = (id: string) => '/api/progress/' + id;
export const getProgress = (id: string, token: string) => api<RecordState>(endpoint(id), token);
export const saveProgress = (id: string, token: string, revision: number, state: Progress) =>
  api<RecordState>(endpoint(id), token, 'PUT', { revision, state });
