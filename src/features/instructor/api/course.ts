import type { StudioSummary } from '@/contracts/studio';
import { api } from '@/lib/api-client';

type Summary = { stage: string | null; complete: boolean; lastSaved: string; stages: Record<string, string> };
export type Learner = {
  id: string;
  label: string;
  progress: Record<string, Summary>;
  studioProgress?: StudioSummary;
};
export type Message = {
  id: string;
  label: string;
  questId: string;
  text: string;
  createdAt: string;
  kind: string;
};

const root = '/api/v1/instructor';
export const getRoster = (token: string) => api<{ learners: Learner[] }>(root + '/roster', token);
export const moderationQueue = (token: string) => api<{ messages: Message[] }>(root + '/moderation', token);
export const createLearner = (token: string, label: string) =>
  api<{ label: string; code: string }>(root + '/roster', token, 'POST', { label });
export const reissueCode = (token: string, id: string) =>
  api<{ code: string }>(root + '/learners/' + id + '/reissue', token, 'POST');
export const hideMessage = (token: string, id: string) => api(root + '/moderation/' + id, token, 'DELETE');
