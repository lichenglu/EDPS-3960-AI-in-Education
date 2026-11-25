import { api } from '@/lib/api-client';
import type { Access } from '@/contracts/session';
import type { WeekOneAction, WeekOneArchive, WeekOneCheckpoint } from '@/contracts/week-one';

const endpoint = '/api/v1/quests/w01';
export const getCheckpoint = (token: string) => api<WeekOneCheckpoint>(endpoint + '/progress', token);
export const commitAction = (token: string, action: WeekOneAction) =>
  api<WeekOneCheckpoint>(endpoint + '/actions', token, 'POST', action);

export const getArchivedCheckpoint = (token: string, version: string) =>
  api<WeekOneArchive>(endpoint + '/archive/' + encodeURIComponent(version), token);

export const startWeekOneDemoRun = (token: string) => api<Access>(endpoint + '/demo-run', token, 'POST');
