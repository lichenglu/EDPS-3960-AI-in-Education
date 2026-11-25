import { expect, type APIRequestContext } from '@playwright/test';

export async function createLearner(request: APIRequestContext) {
  const signIn = await request.post('/api/v1/session', { data: { code: 'DEMO-INSTRUCTOR' } });
  const { token } = await signIn.json();
  const label = 'Playtest ' + crypto.randomUUID().slice(0, 8);
  const created = await request.post('/api/v1/instructor/roster', {
    headers: { Authorization: 'Bearer ' + token },
    data: { label },
  });
  expect(created.ok()).toBeTruthy();
  const { id, code } = await created.json();
  return { id, label, code, instructor: token };
}
