import { api } from '@/lib/api-client';

type Bottle = { id: string; label?: string; text: string };
export type Exchange = {
  own: Bottle | null;
  next: Bottle | null;
  replies: { label: string; text: string }[];
  sentReplies?: { text: string }[];
  responded: boolean;
};
const shelf = (id: string) => '/api/v1/quests/' + id + '/bottles';
export const getBottles = (token: string, id: string) => api<Exchange>(shelf(id), token);
export const sendBottle = (token: string, id: string, text: string) =>
  api<Exchange>(shelf(id), token, 'POST', { text });
export const replyToBottle = (token: string, questId: string, bottleId: string | null, text: string) => {
  if (!bottleId && questId !== 'w01')
    return api<Exchange>('/api/bottles/' + questId + '/reply', token, 'POST', { bottleId, text });
  return api<Exchange>('/api/v1/bottles/' + (bottleId ?? 'example-w01') + '/replies', token, 'POST', {
    text,
  });
};
