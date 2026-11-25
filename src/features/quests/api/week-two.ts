import { weekTwoQuestId, type WeekTwoAction, type WeekTwoCheckpoint } from '@/contracts/week-two';
import { api } from '@/lib/api-client';

const endpoint = '/api/v1/quests/' + weekTwoQuestId;

export const getWeekTwoCheckpoint = (token: string) => api<WeekTwoCheckpoint>(endpoint + '/progress', token);

export const commitWeekTwoAction = (token: string, action: WeekTwoAction) =>
  api<WeekTwoCheckpoint>(endpoint + '/actions', token, 'POST', action);
