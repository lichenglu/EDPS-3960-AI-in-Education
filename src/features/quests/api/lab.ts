import { api } from '@/lib/api-client';

export type LabReply = { text: string; source: 'scripted' | 'generated' };
export const runLabRule = (token: string, mode: 'answer' | 'hint') =>
  api<LabReply>('/api/v1/ai-lab/runs', token, 'POST', { mode });
