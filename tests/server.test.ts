import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test, { type TestContext } from 'node:test';
import { createGameServer } from '../src/server/index.ts';
import { createPostgresDatabase } from '../src/server/database.ts';
import { createLab } from '../src/server/lab/run.ts';
import { studioMissionIds, studioPath, studioVersion, type StudioState } from '../src/contracts/studio.ts';
import { Database } from 'bun:sqlite';
import type { WeekOneIntent } from '../src/contracts/week-one.ts';
import { quests } from '../src/curriculum/index.ts';

const questCatalog = {
  w05: {
    version: 1,
    steps: [
      { id: 'model', stage: 'i-do', type: 'read' },
      { id: 'practice', stage: 'we-do', type: 'read' },
      { id: 'transfer', stage: 'you-do', type: 'write', independent: true },
      { id: 'lab', stage: 'you-do', type: 'lab' },
    ],
  },
};

test('serves the studio at the canonical Week 1 route and allows its captioned video player', async (t) => {
  const staticDir = await mkdtemp(join(tmpdir(), 'studio-route-'));
  t.after(() => rm(staticDir, { recursive: true, force: true }));
  await Bun.write(join(staticDir, 'index.html'), 'Course quest');
  await Bun.write(join(staticDir, 'classroom-studio.html'), 'Classroom AI Studio');
  await Bun.write(join(staticDir, 'studio/models/classroom.glb'), 'Test model');
  const canvasOrigin = 'https://canvas.example.edu';
  const { request } = await start(t, { staticDir, questCatalog: quests, canvasOrigins: [canvasOrigin] });

  for (const path of ['/quests/w01', '/quests/w01/?view=room', '/quests/w01/studio']) {
    const page = await request(path);
    assert.equal(page.status, 200);
    assert.equal(page.value, 'Classroom AI Studio');
    assert.match(
      page.headers.get('content-security-policy') ?? '',
      /frame-src https:\/\/www\.youtube-nocookie\.com/,
    );
    assert.ok(page.headers.get('content-security-policy')?.includes(canvasOrigin));
  }
  const quest = await request('/archive/week-one');
  assert.equal(quest.status, 200);
  assert.equal(quest.value, 'Course quest');
  assert.doesNotMatch(quest.headers.get('content-security-policy') ?? '', /youtube-nocookie/);
  assert.equal((await request('/quests/w02/studio')).status, 404);
  const model = await request('/studio/models/classroom.glb');
  assert.equal(model.status, 200);
  assert.equal(model.headers.get('content-type'), 'model/gltf-binary');
});

test('serves printable pages for course weeks without learner access', async (t) => {
  const staticDir = await mkdtemp(join(tmpdir(), 'print-route-'));
  t.after(() => rm(staticDir, { recursive: true, force: true }));
  await Bun.write(join(staticDir, 'index.html'), 'Course quest');
  const { request } = await start(t, { staticDir, questCatalog: quests });

  for (const { id } of Object.values(quests)) {
    const page = await request(`/quests/${id}/print`);
    assert.equal(page.status, 200, id);
    assert.equal(page.value, 'Course quest');
  }
  assert.equal((await request('/quests/w01/print/?lang=es')).status, 200);
  assert.equal((await request('/quests/w99/print')).status, 404);
});

type RequestOptions = { remoteAddress?: string; token?: string; json?: unknown; method?: string };
type Result = { status: number; value: any; headers: Headers };

function start(t: TestContext, options: Parameters<typeof createGameServer>[0] = {}) {
  const app = createGameServer({ dbPath: ':memory:', questCatalog, ...options });
  t.after(app.close);
  const request = (
    path: string,
    { token, json, method = 'GET', remoteAddress = '127.0.0.1' }: RequestOptions = {},
  ) => {
    const headers: Record<string, string> = {};
    if (token) headers.authorization = 'Bearer ' + token;
    if (json !== undefined) headers['content-type'] = 'application/json';
    const stream = Readable.from(json === undefined ? [] : [Buffer.from(JSON.stringify(json))]);
    const req = Object.assign(stream, { url: path, headers, method, socket: { remoteAddress } });

    return new Promise<Result>((resolve) => {
      const responseHeaders = new Headers();
      let status = 200;
      const res = {
        headersSent: false,
        setHeader(name: string, value: string) {
          responseHeaders.set(name, value);
        },
        writeHead(code: number, values: Record<string, string | number>) {
          status = code;
          this.headersSent = true;
          for (const [name, value] of Object.entries(values)) responseHeaders.set(name, String(value));
        },
        end(chunk?: string | Buffer) {
          const data = chunk?.toString() ?? '';
          const value = responseHeaders.get('content-type')?.includes('json') ? JSON.parse(data) : data;
          resolve({ status, value, headers: responseHeaders });
        },
      };
      app.server.emit('request', req, res);
    });
  };
  const signIn = async (code: string): Promise<string> => {
    const result = await request('/api/session', { method: 'POST', json: { code } });
    assert.equal(result.status, 200);
    return result.value.token;
  };
  return { request, signIn, close: app.close };
}

test('validates access codes, opaque sessions, roles, and roster boundaries', async (t) => {
  const { request, signIn } = await start(t);
  const invalid = await request('/api/session', { method: 'POST', json: { code: 'wrong' } });
  assert.equal(invalid.status, 401);
  assert.equal((await request('/api/session')).status, 401);
  const student = await signIn('DEMO-LEARNER');
  const primaryInstructor = await signIn('DEMO-INSTRUCTOR');
  const otherInstructor = await signIn('DEMO-OTHER-INSTRUCTOR');
  assert.equal((await request('/api/session', { token: student })).value.role, 'learner');
  assert.equal((await request('/api/roster', { token: student })).status, 403);
  const roster = (await request('/api/roster', { token: primaryInstructor })).value.learners;
  const other = (await request('/api/roster', { token: otherInstructor })).value.learners;
  assert.equal(roster.length, 2);
  assert.equal(other.length, 1);
  assert.ok(
    !other.some(({ id }: { id: string }) => roster.some((learner: { id: string }) => learner.id === id)),
  );
  assert.equal(
    (
      await request('/api/roster/' + other[0].id + '/reissue', {
        method: 'POST',
        token: primaryInstructor,
      })
    ).status,
    404,
  );
});

test('saves progress, rejects stale writes, and preserves the independent attempt', async (t) => {
  const { request, signIn } = await start(t);
  const token = await signIn('DEMO-LEARNER');
  const instructor = await signIn('DEMO-INSTRUCTOR');
  const path = '/api/progress/w05';
  const save = (revision: number, state: unknown) =>
    request(path, { token, method: 'PUT', json: { revision, state } });
  assert.deepEqual((await request(path, { token })).value, { revision: 0, state: null, lastSaved: null });
  assert.equal((await save(0, { index: 2, entries: {} })).status, 422);
  const toPractice = await save(0, { index: 1, entries: {} });
  assert.equal(toPractice.status, 200);
  assert.equal(toPractice.value.revision, 1);
  assert.ok(Date.parse(toPractice.value.lastSaved));
  assert.equal((await save(0, { index: 1, entries: {} })).status, 409);
  assert.equal((await save(1, { index: 2, entries: {} })).status, 200);
  const attempt = { first: 'Check who supplied each step.', revision: 'Ask for a fresh example.' };
  const saved = await save(2, { index: 2, entries: { transfer: attempt } });
  assert.equal(saved.status, 200);
  assert.equal((await save(3, { index: 2, entries: { transfer: { first: 'Overwrite' } } })).status, 422);
  assert.equal((await save(3, { index: 3, entries: {} })).status, 422);
  assert.equal((await save(3, { index: 3, entries: { transfer: attempt } })).status, 200);
  assert.equal((await save(4, { index: 4, entries: { transfer: attempt } })).status, 200);
  const roster = (await request('/api/roster', { token: instructor })).value.learners;
  assert.ok(
    roster.some(
      (learner: { progress: { w05?: { complete: boolean } } }) => learner.progress.w05?.complete === true,
    ),
  );
  assert.equal((await request('/api/progress/w99', { token })).status, 404);
  const peer = await signIn('DEMO-PEER');
  assert.equal((await request(path, { token: peer })).value.state, null);
});

test('reissues a random code, revokes the old session, and retains progress', async (t) => {
  const { request, signIn } = await start(t);
  const instructor = await signIn('DEMO-INSTRUCTOR');
  const newLearner = await request('/api/roster', {
    method: 'POST',
    token: instructor,
    json: { label: 'Learner test' },
  });
  assert.equal(newLearner.status, 201);
  assert.ok(newLearner.value.code.length >= 24);
  const token = await signIn(newLearner.value.code);
  const path = '/api/progress/w05';
  assert.equal(
    (
      await request(path, {
        method: 'PUT',
        token,
        json: { revision: 0, state: { index: 1, entries: {} } },
      })
    ).status,
    200,
  );
  const reissue = await request('/api/roster/' + newLearner.value.id + '/reissue', {
    method: 'POST',
    token: instructor,
  });
  assert.equal(reissue.status, 200);
  assert.notEqual(reissue.value.code, newLearner.value.code);
  assert.equal((await request('/api/session', { token })).status, 401);
  assert.equal(
    (await request('/api/session', { method: 'POST', json: { code: newLearner.value.code } })).status,
    401,
  );
  const reentered = await signIn(reissue.value.code);
  assert.equal((await request(path, { token: reentered })).value.state.index, 1);
});

test('requires an own note, scopes peer replies, and lets the instructor moderate', async (t) => {
  const w05 = { ...questCatalog.w05, steps: [{ id: 'bottle', stage: 'we-do', type: 'bottle' }] };
  const { request, signIn } = start(t, { questCatalog: { w05 } });
  const student = await signIn('DEMO-LEARNER');
  const peer = await signIn('DEMO-PEER');
  const other = await signIn('DEMO-OTHER-LEARNER');
  const instructor = await signIn('DEMO-INSTRUCTOR');
  const path = '/api/bottles/w05';
  const post = (token: string, text: string) => request(path, { token, method: 'POST', json: { text } });
  const reply = (token: string, bottleId: string | null) =>
    request(path + '/reply', {
      token,
      method: 'POST',
      json: { bottleId, text: 'Compare the next attempt.' },
    });
  const save = () =>
    request('/api/progress/w05', {
      method: 'PUT',
      token: student,
      json: { revision: 0, state: { index: 1, entries: { bottle: { reflection: 'My next test.' } } } },
    });
  const message = await post(student, 'Pip supplied the answer.');
  assert.equal(message.status, 200);
  assert.equal(message.value.next, null);
  assert.equal((await save()).status, 422);
  assert.equal((await request(path, { token: peer })).value.next, null);
  assert.equal((await reply(peer, message.value.own.id)).status, 403);
  assert.equal((await post(other, 'A different class note.')).value.next, null);
  assert.equal((await reply(other, message.value.own.id)).status, 404);
  assert.equal((await reply(student, null)).value.responded, true);
  assert.equal((await save()).status, 200);
  assert.equal((await post(peer, 'Check another case.')).value.next.id, message.value.own.id);
  assert.equal((await reply(peer, message.value.own.id)).status, 200);
  const asAuthor = await request(path, { token: peer });
  assert.deepEqual(asAuthor.value.sentReplies, [{ text: 'Compare the next attempt.' }]);
  assert.deepEqual((await request(path, { token: other })).value.sentReplies, []);
  assert.equal((await request(path, { token: student })).value.replies.length, 1);
  assert.equal((await request('/api/moderation', { token: student })).status, 403);
  assert.equal((await request('/api/moderation', { token: instructor })).value.messages.length, 3);
  const visibleReply = (await request('/api/moderation', { token: instructor })).value.messages.find(
    (message: { kind: string }) => message.kind === 'reply',
  );
  assert.equal(
    (await request('/api/moderation/' + visibleReply.id, { method: 'DELETE', token: instructor })).status,
    200,
  );
  assert.deepEqual((await request(path, { token: peer })).value.sentReplies, []);
  assert.equal((await request(path, { token: peer })).value.responded, true);
  assert.deepEqual((await request(path, { token: student })).value.sentReplies, [
    { text: 'Compare the next attempt.' },
  ]);
  const removed = await request('/api/moderation/' + message.value.own.id, {
    method: 'DELETE',
    token: instructor,
  });
  assert.equal(removed.status, 200);
  assert.equal((await request(path, { token: peer })).value.next, null);
});

test('persists checkpoints between server launches with no browser storage', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'next-move-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const options = { dbPath: join(directory, 'course.sqlite') };
  const first = await start(t, options);
  const token = await first.signIn('DEMO-LEARNER');
  await first.request('/api/progress/w05', {
    token,
    method: 'PUT',
    json: { revision: 0, state: { index: 1, entries: {} } },
  });
  await first.close();
  const next = await start(t, options);
  const newToken = await next.signIn('DEMO-LEARNER');
  assert.equal((await next.request('/api/progress/w05', { token: newToken })).value.state.index, 1);
  await next.close();
});

test('uses the configured frame allowlist and gives invalid links an HTTP 404', async (t) => {
  const { request } = await start(t, {
    canvasOrigins: ['https://canvas.example.edu', 'http://127.0.0.1:4300'],
  });
  const invalid = await request('/quests/w99');
  assert.equal(invalid.status, 404);
  assert.match(
    invalid.headers.get('content-security-policy') ?? '',
    /frame-ancestors 'self' https:\/\/canvas\.example\.edu http:\/\/127\.0\.0\.1:4300\b/,
  );
  assert.throws(
    () => createGameServer({ dbPath: ':memory:', canvasOrigins: ['https://canvas.example.edu/invalid'] }),
    /origin/i,
  );
});

test('Week 1 actions commit once, reject stale requests, and retire snapshot writes', async (t) => {
  const { request, signIn } = start(t, { questCatalog: quests });
  const token = await signIn('DEMO-LEARNER');
  const other = await signIn('DEMO-PEER');
  const staff = await signIn('DEMO-INSTRUCTOR');
  const path = '/api/v1/quests/w01';
  const initial = await request(path + '/progress', { token });
  assert.equal(initial.status, 200);
  assert.equal(initial.value.revision, 0);
  assert.equal(initial.value.unlocked, undefined);
  assert.equal((await request(path + '/progress', { token: staff })).status, 403);
  const send = (json: unknown) => request(path + '/actions', { method: 'POST', token, json });
  const action = {
    actionId: 'receipt-one',
    expectedRevision: 0,
    contentVersion: '3',
    intent: { stepId: 'opening', type: 'inspectEvidence', evidence: 'practice' },
  };
  const first = await send(action);
  assert.equal(first.status, 200);
  assert.deepEqual(first.value.state.entries.opening.inspected, ['practice']);
  const next = {
    ...action,
    actionId: 'receipt-two',
    expectedRevision: 1,
    intent: { ...action.intent, evidence: 'fresh' },
  };
  assert.equal((await send(next)).status, 200);
  assert.deepEqual((await send(action)).value, first.value);
  assert.equal((await send({ ...next, actionId: action.actionId })).status, 409);
  const conflict = await send({ ...action, actionId: 'different-one' });
  assert.equal(conflict.status, 409);
  assert.match(conflict.value.type, /stale-revision$/);
  assert.match(conflict.headers.get('content-type')!, /problem\+json/);
  assert.match(
    (await send({ ...action, actionId: 'obsolete', contentVersion: '1' })).value.type,
    /stale-content-version$/,
  );
  assert.equal(
    (await request('/api/progress/w01', { method: 'PUT', token, json: { revision: 2, state: {} } })).status,
    410,
  );
  assert.equal((await request(path + '/progress', { token })).value.revision, 2);
  assert.equal((await request(path + '/progress', { token: other })).value.revision, 0);
  assert.equal((await request('/api/v1/quests/w99/progress', { token })).status, 404);
  assert.equal(
    (
      await send({
        ...action,
        actionId: 'skip-step',
        expectedRevision: 2,
        intent: { stepId: 'response-lab', type: 'runReplay' },
      })
    ).status,
    422,
  );
  assert.equal(
    (await request('/api/bottles/w01', { method: 'POST', token, json: { text: 'Too early' } })).status,
    403,
  );
  assert.equal((await request('/api/lab', { method: 'POST', token, json: { mode: 'hint' } })).status, 403);
});

test('plays all three stages, separates assisted revisions, and lights the roster only after the final save', async (t) => {
  let paidCalls = 0;
  const { request, signIn } = start(t, {
    questCatalog: quests,
    aiEnabled: true,
    aiKey: 'test-private-project-key',
    aiFetch: async () => {
      paidCalls++;
      throw new Error('Test provider is offline');
    },
  });
  const token = await signIn('DEMO-LEARNER');
  const instructor = await signIn('DEMO-INSTRUCTOR');
  const resource = '/api/v1/quests/w01';
  let revision = 0;
  const send = async (intent: WeekOneIntent, status = 200) => {
    const result = await request(resource + '/actions', {
      token,
      method: 'POST',
      json: { actionId: crypto.randomUUID(), contentVersion: '3', expectedRevision: revision, intent },
    });
    assert.equal(result.status, status, JSON.stringify({ intent, message: result.value.detail }));
    if (status === 200) revision = result.value.revision;
    return result.value;
  };
  const advance = (stepId: string) => send({ type: 'advance', stepId });
  const write = (stepId: string) =>
    send({
      type: 'writeNote',
      stepId,
      text: 'I compared the source of each response and proposed a fresh test.',
    });
  const choose = (stepId: string, selected: number) => send({ type: 'selectChoice', stepId, selected });
  await send({ type: 'inspectEvidence', stepId: 'opening', evidence: 'fresh' }, 422);
  await send({ type: 'inspectEvidence', stepId: 'opening', evidence: 'practice' });
  await send({ type: 'inspectEvidence', stepId: 'opening', evidence: 'fresh' });
  await choose('opening', 1);
  await advance('opening');
  await send({ type: 'selectChoice', stepId: 'ask-lantern', selected: 0 }, 422);
  await send({ type: 'attachEvidence', stepId: 'mark-evidence', evidence: 'organizer' }, 422);
  const revisedOpening = await choose('opening', 0);
  assert.equal(revisedOpening.state.index, 1);
  assert.equal(revisedOpening.state.entries.opening.selected, 0);
  await write('previous-work');
  await advance('previous-work');
  await send({ type: 'reveal', stepId: 'three-perspectives' });
  await advance('three-perspectives');
  await choose('predict-demo', 0);
  await advance('predict-demo');
  await write('demo-evidence');
  await advance('demo-evidence');
  await choose('ask-lantern', 0);
  await advance('ask-lantern');
  await send({ type: 'requestHint', stepId: 'mark-evidence' }, 422);
  await send({ type: 'attachEvidence', stepId: 'mark-evidence', evidence: 'draft' });
  await choose('mark-evidence', 1);
  await send({ type: 'requestHint', stepId: 'mark-evidence' });
  await send({ type: 'advance', stepId: 'mark-evidence' }, 422);
  await send({ type: 'attachEvidence', stepId: 'mark-evidence', evidence: 'organizer' });
  await choose('mark-evidence', 0);
  await advance('mark-evidence');
  await send({ type: 'selectRule', stepId: 'change-rule', rule: 'answer' });
  await send({ type: 'predict', stepId: 'change-rule', text: 'Pip writes a notice.' });
  await send({ type: 'runReplay', stepId: 'change-rule' });
  await send({ type: 'advance', stepId: 'change-rule' }, 422);
  await send({ type: 'selectRule', stepId: 'change-rule', rule: 'attempt-first' });
  await send({ type: 'runReplay', stepId: 'change-rule' }, 422);
  await send({ type: 'predict', stepId: 'change-rule', text: 'The volunteer checks the source.' });
  await send({ type: 'runReplay', stepId: 'change-rule' });
  await advance('change-rule');
  await write('compare-measures');
  await advance('compare-measures');
  const bottles = resource + '/bottles';
  await send({ type: 'advance', stepId: 'drift-bottle' }, 422);
  assert.equal(
    (
      await request(bottles, {
        token,
        method: 'POST',
        json: { text: 'Which detail does the organizer confirm?' },
      })
    ).value.next,
    null,
  );
  assert.equal(
    (
      await request('/api/v1/bottles/example-w01/replies', {
        token,
        method: 'POST',
        json: { text: 'Compare the sign with the source note.' },
      })
    ).value.responded,
    true,
  );
  await write('drift-bottle');
  const preTransfer = await advance('drift-bottle');
  assert.equal(preTransfer.unlocked, undefined);
  assert.equal(
    (await request('/api/v1/ai-lab/runs', { token, method: 'POST', json: { mode: 'answer' } })).status,
    403,
  );
  const filing = {
    type: 'fileFirstAttempt',
    stepId: 'recommendation',
    text: 'Eunseo checked the organizer’s note before recording a claim.',
    rule: 'attempt-first',
  } as const;
  const sealed = await send(filing);
  assert.ok(sealed.unlocked.feedback);
  assert.equal(sealed.unlocked.replay, undefined);
  await send({ ...filing, text: 'Overwrite the first.' }, 409);
  assert.equal(
    (await request('/api/v1/ai-lab/runs', { token, method: 'POST', json: { mode: 'answer' } })).value.source,
    'scripted',
  );
  assert.equal(paidCalls, 0, 'The public demo course cannot dispatch paid requests');
  await advance('recommendation');
  await send({ type: 'advance', stepId: 'response-lab' }, 422);
  const replay = await send({ type: 'runReplay', stepId: 'response-lab' });
  assert.match(replay.unlocked.replay, /confirmation email at the welcome desk/);
  await send({
    type: 'reviseAttempt',
    stepId: 'recommendation',
    text: 'I would check a new case without help.',
  });
  await write('response-lab');
  await advance('response-lab');
  await write('orientation');
  const final = await advance('orientation');
  assert.equal(final.state.index, quests.w01.steps.length);
  assert.equal(final.state.entries.recommendation.first, filing.text);
  assert.notEqual(final.state.entries.recommendation.revision, filing.text);
  const resumed = await request(resource + '/progress', { token: await signIn('DEMO-LEARNER') });
  assert.deepEqual(resumed.value, final);
  const rows = (await request('/api/v1/instructor/roster', { token: instructor })).value.learners;
  const progress = rows.find((row: { id: string }) => row.id === 'demo-1').progress.w01;
  assert.equal(progress.complete, true);
  assert.equal(progress.lastSaved, final.lastSaved);

  const invalid: WeekOneIntent[] = [
    { type: 'selectChoice', stepId: 'predict-demo', selected: 99 },
    { type: 'selectChoice', stepId: 'change-rule', selected: 0 },
    { type: 'runReplay', stepId: 'change-rule' },
    { type: 'advance', stepId: 'opening' },
    { type: 'attachEvidence', stepId: 'opening', evidence: 'draft' },
    { type: 'selectRule', stepId: 'recommendation', rule: 'answer' },
  ];
  for (const intent of invalid) await send(intent, 422);
  await choose('predict-demo', 1);
  await choose('ask-lantern', 1);
  const evidenceChange = await send({ type: 'attachEvidence', stepId: 'mark-evidence', evidence: 'draft' });
  assert.equal(evidenceChange.state.entries['mark-evidence'].selected, undefined);
  assert.equal(evidenceChange.state.index, final.state.index);

  const changed = await choose('mark-evidence', 1);
  assert.equal(changed.state.index, quests.w01.steps.length);
  assert.deepEqual(changed.state.entries, {
    ...final.state.entries,
    'predict-demo': { ...final.state.entries['predict-demo'], selected: 1 },
    'ask-lantern': { ...final.state.entries['ask-lantern'], selected: 1 },
    'mark-evidence': { ...final.state.entries['mark-evidence'], selected: 1, evidence: 'draft' },
  });
  assert.deepEqual((await request(resource + '/progress', { token })).value, changed);
  const updatedRoster = (await request('/api/v1/instructor/roster', { token: instructor })).value.learners;
  assert.equal(updatedRoster.find((row: { id: string }) => row.id === 'demo-1').progress.w01.complete, true);
});

test('archives earlier case versions privately and never credits their work to the new notice case', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'next-move-archive-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dbPath = join(directory, 'course.sqlite');
  const seed = start(t, { dbPath });
  await seed.close();
  const db = new Database(dbPath);
  const saved = '2025-06-01T01:00:00.000Z';
  const legacy = {
    index: 12,
    entries: { recommendation: { first: 'My own first finding.', revision: 'Second draft.' } },
  };
  const completed = { index: 13, entries: { ...legacy.entries, 'mark-evidence': { evidence: 'nine' } } };
  const intent = { type: 'attachEvidence', stepId: 'mark-evidence', evidence: 'nine' };
  const receipt = {
    questId: 'w01',
    contentVersion: '2',
    revision: 7,
    lastSaved: saved,
    state: { index: 6, entries: { 'mark-evidence': { evidence: 'nine' } } },
  };
  const insert = db.prepare('INSERT INTO progress VALUES (?, ?, ?, ?, ?, ?, ?)');
  insert.run('demo-1', 'w01', '1', 18, JSON.stringify(legacy), '{}', saved);
  insert.run('demo-1', 'w01', '2', 50, JSON.stringify(completed), JSON.stringify({ complete: true }), saved);
  db.prepare('INSERT INTO action_receipts VALUES (?, ?, ?, ?, ?, ?)').run(
    'demo-1',
    'w01',
    '2',
    'old-retry',
    JSON.stringify(intent),
    JSON.stringify(receipt),
  );
  db.close();
  const game = start(t, { dbPath, questCatalog: quests });
  const token = await game.signIn('DEMO-LEARNER');
  const peer = await game.signIn('DEMO-PEER');
  const staff = await game.signIn('DEMO-INSTRUCTOR');
  const path = '/api/v1/quests/w01';
  const read = await game.request(path + '/progress', { token });
  assert.equal(read.value.contentVersion, '3');
  assert.equal(read.value.lastSaved, null);
  assert.equal(read.value.revision, 0);
  assert.deepEqual(read.value.state, { index: 0, entries: {} });
  assert.deepEqual(read.value.archivedVersions, ['2', '1']);
  assert.equal(read.value.unlocked, undefined);
  assert.equal(
    (await game.request('/api/lab', { token, method: 'POST', json: { mode: 'hint' } })).status,
    403,
  );
  assert.equal(
    (await game.request('/api/v1/instructor/roster', { token: staff })).value.learners[0].progress.w01,
    undefined,
  );
  const readArchive = (version: string, actor: string) =>
    game.request(path + '/archive/' + version, { token: actor });
  assert.equal((await readArchive('2', peer)).status, 404);
  assert.equal((await readArchive('2', staff)).status, 403);
  assert.equal((await readArchive('3', token)).status, 404);
  assert.deepEqual((await readArchive('1', token)).value.state, legacy);
  assert.deepEqual((await readArchive('2', token)).value.state, completed);
  assert.deepEqual((await game.request('/api/progress/w01', { token })).value.state, legacy);
  const retry = (id: string) =>
    game.request(path + '/actions', {
      token,
      method: 'POST',
      json: { contentVersion: '2', actionId: id, expectedRevision: 6, intent },
    });
  assert.deepEqual((await retry('old-retry')).value, receipt);
  assert.equal((await retry('new-id')).status, 409);
  assert.equal(
    (
      await game.request(path + '/actions', {
        token,
        method: 'POST',
        json: { contentVersion: '3', actionId: 'old-evidence', expectedRevision: 0, intent },
      })
    ).status,
    400,
  );
  const fresh = await game.request(path + '/actions', {
    token,
    method: 'POST',
    json: {
      contentVersion: '3',
      actionId: 'start-notice',
      expectedRevision: 0,
      intent: { type: 'inspectEvidence', stepId: 'opening', evidence: 'practice' },
    },
  });
  assert.equal(fresh.status, 200);
  assert.deepEqual((await readArchive('2', token)).value.state, completed);
});

test('class exchanges are isolated from pre-notice Week 1 bottles and replies', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'next-move-bottles-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dbPath = join(directory, 'course.sqlite');
  const seed = start(t, { dbPath });
  await seed.close();
  const db = new Database(dbPath);
  const saved = '2026-11-12T12:00:00.000Z';
  const put = db.prepare('INSERT INTO bottles VALUES (?, ?, ?, ?, ?, ?, 0)');
  put.run('earlier-own', 'demo-1', 'w01', '1', 'My old case.', saved);
  put.run('earlier-peer', 'demo-2', 'w01', '1', 'Different old case.', saved);
  db.prepare('INSERT INTO replies VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
    'earlier-reply',
    'demo-1',
    'w01',
    '1',
    'earlier-peer',
    'Old reasoning.',
    saved,
  );
  const index = quests.w01.steps.findIndex((step) => step.id === 'drift-bottle');
  db.prepare('INSERT INTO progress VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    'demo-1',
    'w01',
    '3',
    10,
    JSON.stringify({ index, entries: {} }),
    '{}',
    saved,
  );
  db.close();
  const game = start(t, { dbPath, questCatalog: quests });
  const token = await game.signIn('DEMO-LEARNER');
  const bottle = '/api/v1/quests/w01/bottles';
  const exchange = await game.request(bottle, { token });
  assert.equal(exchange.status, 200);
  assert.deepEqual(exchange.value, { own: null, next: null, replies: [], sentReplies: [], responded: false });
  const premature = await game.request('/api/v1/quests/w01/actions', {
    token,
    method: 'POST',
    json: {
      contentVersion: '3',
      actionId: 'old-reply',
      expectedRevision: 10,
      intent: { type: 'writeNote', stepId: 'drift-bottle', text: 'New reflection' },
    },
  });
  assert.equal(premature.status, 422);
  const posted = await game.request(bottle, { token, method: 'POST', json: { text: 'A notice question.' } });
  assert.equal(posted.value.next, null);
  assert.equal(
    (
      await game.request('/api/v1/bottles/earlier-peer/replies', {
        token,
        method: 'POST',
        json: { text: 'Different case' },
      })
    ).status,
    404,
  );
});

test('Week 1 keeps a stable learner identity and the original move through code reissue', async (t) => {
  const { signIn, request } = start(t, { questCatalog: quests });
  const token = await signIn('DEMO-LEARNER');
  const staff = await signIn('DEMO-INSTRUCTOR');
  const before = await request('/api/v1/session', { token });
  assert.match(before.value.accountKey, /^[a-f0-9]{64}$/);
  const action = {
    actionId: 'pending-tray',
    contentVersion: '3',
    expectedRevision: 0,
    intent: { stepId: 'opening', type: 'inspectEvidence', evidence: 'practice' },
  };
  const resource = '/api/v1/quests/w01/actions';
  const receipt = await request(resource, { token, method: 'POST', json: action });
  const replacement = await request('/api/v1/instructor/learners/demo-1/reissue', {
    token: staff,
    method: 'POST',
  });
  assert.equal((await request(resource, { token, method: 'POST', json: action })).status, 401);
  const replacementToken = await signIn(replacement.value.code);
  assert.equal(
    (await request('/api/v1/session', { token: replacementToken })).value.accountKey,
    before.value.accountKey,
  );
  assert.notEqual(
    (await request('/api/v1/session', { token: await signIn('DEMO-PEER') })).value.accountKey,
    before.value.accountKey,
  );
  const retried = await request(resource, { token: replacementToken, method: 'POST', json: action });
  assert.deepEqual(retried.value, receipt.value);
  assert.equal(retried.value.revision, 1);
});

test('the independent replay repeats the original sign for draft-first and asks for a source only under the changed rule', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'next-move-replay-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dbPath = join(directory, 'course.sqlite');
  const seed = start(t, { dbPath });
  await seed.close();
  const db = new Database(dbPath);
  const stage = quests.w01.steps.findIndex((step) => step.id === 'response-lab');
  const insert = db.prepare('INSERT INTO progress VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const [learner, rule] of [
    ['demo-1', 'answer'],
    ['demo-2', 'attempt-first'],
  ]) {
    insert.run(
      learner,
      'w01',
      '3',
      25,
      JSON.stringify({
        index: stage,
        entries: { recommendation: { first: 'My independent comparison.', rule } },
      }),
      '{}',
      '2027-01-10T22:00:00.000Z',
    );
  }
  db.close();
  const game = start(t, { dbPath, questCatalog: quests });
  const replay = async (code: string) => {
    const token = await game.signIn(code);
    const result = await game.request('/api/v1/quests/w01/actions', {
      token,
      method: 'POST',
      json: {
        actionId: 'my-replay',
        contentVersion: '3',
        expectedRevision: 25,
        intent: { stepId: 'response-lab', type: 'runReplay' },
      },
    });
    assert.equal(result.status, 200);
    return result.value.unlocked.replay;
  };
  assert.equal(
    await replay('DEMO-LEARNER'),
    'Pip: “Workshop attendees: show your staff badge at the welcome desk.”',
  );
  assert.match(
    await replay('DEMO-PEER'),
    /Which line tells workshop attendees what to show.+confirmation email at the welcome desk/,
  );
});

test('a fresh local Week 1 run keeps the saved learner, roster, notes and independent attempt separate', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'next-move-local-run-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dbPath = join(directory, 'course.sqlite');
  let paidCalls = 0;
  const { request, signIn } = start(t, {
    dbPath,
    questCatalog: quests,
    demoRunsEnabled: true,
    aiEnabled: true,
    aiKey: 'test-key',
    aiFetch: async () => {
      paidCalls++;
      throw new Error('Mock provider offline');
    },
  });
  const token = await signIn('DEMO-LEARNER');
  const staff = await signIn('DEMO-INSTRUCTOR');
  const route = '/api/v1/quests/w01';
  const db = new Database(dbPath);
  t.after(() => db.close());
  const savedAt = '2027-01-16T23:12:42.000Z';
  const original = {
    index: 13,
    entries: { recommendation: { first: 'My original evidence.', revision: 'My separate revision.' } },
  };
  const put = db.prepare('INSERT INTO progress VALUES (?, ?, ?, ?, ?, ?, ?)');
  put.run('demo-1', 'w01', '3', 30, JSON.stringify(original), JSON.stringify({ complete: true }), savedAt);
  const old = (await request(route + '/progress', { token })).value;
  const roster = (await request('/api/roster', { token: staff })).value;
  const source = (await request('/api/v1/session', { token })).value;
  assert.equal(source.canStartDemoRun, true);
  const run = await request(route + '/demo-run', { token, method: 'POST' });
  assert.equal(run.status, 201);
  assert.equal(run.value.role, 'learner');
  assert.equal(run.value.code, undefined);
  assert.notEqual(run.value.token, token);
  assert.notEqual(run.value.accountKey, source.accountKey);
  const fresh = run.value.token;
  assert.equal((await request('/api/v1/session', { token: fresh })).value.canStartDemoRun, true);
  const record = (await request(route + '/progress', { token: fresh })).value;
  assert.deepEqual(record.state, { index: 0, entries: {} });
  assert.equal(record.revision, 0);
  assert.equal(record.lastSaved, null);
  assert.equal(record.unlocked, undefined);
  assert.deepEqual((await request(route + '/progress', { token })).value, old);
  assert.deepEqual((await request('/api/roster', { token: staff })).value, roster);
  const another = await request(route + '/demo-run', { token: fresh, method: 'POST' });
  assert.equal(another.status, 201);
  assert.notEqual(another.value.accountKey, run.value.accountKey);
  const isolated = db
    .query<{ id: string; course_id: string }, []>(
      "SELECT id, course_id FROM accounts WHERE label = 'Practice learner'",
    )
    .all();
  assert.equal(isolated.length, 2);
  assert.notEqual(isolated[0].course_id, isolated[1].course_id);
  for (const learner of isolated) {
    assert.notEqual(learner.course_id, 'demo');
    put.run(learner.id, 'w01', '3', 30, JSON.stringify(original), '{}', savedAt);
  }
  const post = (as: string, text: string) =>
    request(route + '/bottles', { token: as, method: 'POST', json: { text } });
  const originalNote = await post(token, 'Original course note');
  await post(fresh, 'Preview note');
  assert.equal((await post(another.value.token, 'Other preview note')).value.next, null);
  assert.equal((await request(route + '/bottles', { token: fresh })).value.next, null);
  assert.equal(
    (
      await request('/api/v1/bottles/' + originalNote.value.own.id + '/replies', {
        token: fresh,
        method: 'POST',
        json: { text: 'Cross-course message' },
      })
    ).status,
    404,
  );
  assert.equal(
    (await request('/api/lab', { token: fresh, method: 'POST', json: { mode: 'hint' } })).value.source,
    'scripted',
  );
  assert.equal(paidCalls, 0);
});

test('only authenticated learners in an enabled local preview can start a demo run', async (t) => {
  const route = '/api/v1/quests/w01/demo-run';
  const regular = start(t, { questCatalog: quests });
  const original = await regular.signIn('DEMO-LEARNER');
  assert.equal((await regular.request('/api/session', { token: original })).value.canStartDemoRun, false);
  assert.equal((await regular.request(route, { token: original, method: 'POST' })).status, 404);
  const preview = start(t, { questCatalog: quests, demoRunsEnabled: true });
  assert.equal((await preview.request(route, { method: 'POST' })).status, 401);
  const instructor = await preview.signIn('DEMO-INSTRUCTOR');
  assert.equal((await preview.request('/api/session', { token: instructor })).value.canStartDemoRun, false);
  assert.equal((await preview.request(route, { token: instructor, method: 'POST' })).status, 403);
  const token = await preview.signIn('DEMO-LEARNER');
  assert.equal((await preview.request(route, { token, method: 'GET' })).status, 405);
  assert.equal(
    (await preview.request(route, { token, method: 'POST', remoteAddress: '192.0.2.7' })).status,
    404,
  );
  assert.equal(
    (await preview.request('/api/session', { token, remoteAddress: '192.0.2.7' })).value.canStartDemoRun,
    false,
  );
});

const studioRoster = '/api/v1/instructor/roster';
const studioFixture: StudioState = {
  arrival: 'ideas',
  activeMission: 'transcript',
  progress: {},
  stations: {},
  lesson: {
    checkpoint: 'practice',
    introDone: true,
    previouslyCompleted: false,
    note: '',
    reply: '',
    noteSaved: false,
    replySaved: false,
  },
  work: { transcript: { ran: true, accuracy: 71 } },
};

async function checkStudioCheckpoint(
  t: TestContext,
  options?: Parameters<typeof createGameServer>[0],
  staffCode = 'DEMO-INSTRUCTOR',
) {
  const { request, signIn } = await start(t, { studioAccounts: true, ...options });
  const instructor = await signIn(staffCode);
  async function learner(label: string) {
    const response = await request(studioRoster, { method: 'POST', token: instructor, json: { label } });
    assert.equal(response.status, 201);
    return { id: response.value.id, token: await signIn(response.value.code) };
  }
  const first = await learner('Studio check A');
  const second = await learner('Studio check B');
  const config = await request(studioPath + '/config');
  assert.equal(config.value.requireAccount, true);
  assert.equal((await request(studioPath)).status, 401);
  assert.equal((await request(studioPath, { token: instructor })).status, 403);
  const save = (revision: number, state: unknown) =>
    request(studioPath, {
      method: 'PUT',
      token: first.token,
      json: { revision, version: studioVersion, state },
    });
  const checkpoint = await save(0, studioFixture);
  assert.equal(checkpoint.status, 200);
  assert.deepEqual(checkpoint.value.state, studioFixture);
  assert.deepEqual((await save(0, studioFixture)).value, checkpoint.value);
  const awarded = { ...studioFixture, progress: { transcript: ['run'] } };
  const split = await Promise.all([
    save(1, awarded),
    save(1, { ...awarded, work: { transcript: { ran: false } } }),
  ]);
  assert.deepEqual(split.map((result) => result.status).sort(), [200, 409]);
  assert.equal((await save(2, { ...awarded, activeMission: 'reading' })).status, 422);
  assert.equal(
    (await save(2, { ...studioFixture, work: { transcript: { unlisted: 'private' } } })).status,
    422,
  );
  assert.deepEqual((await request(studioPath, { token: second.token })).value, {
    revision: 0,
    state: null,
    lastSaved: null,
  });
  const roster = await request(studioRoster, { token: instructor });
  const row = roster.value.learners.find(({ id }: { id: string }) => id === first.id);
  assert.equal(row.studioProgress.stages['we-do'], 'in-progress');
  assert.equal(row.studioProgress.completedMissions, 0);
  assert.equal(row.studioProgress.lastSaved, split.find((result) => result.status === 200)?.value.lastSaved);
  assert.equal(
    roster.value.learners.find(({ id }: { id: string }) => id === second.id).studioProgress,
    undefined,
  );
  assert.equal(row.progress.w01, undefined);
  assert.equal((await request('/api/v1/instructor/moderation', { token: instructor })).status, 200);
  const reissued = await request('/api/v1/instructor/learners/' + first.id + '/reissue', {
    method: 'POST',
    token: instructor,
  });
  assert.equal(reissued.status, 200);
  assert.equal((await request(studioPath, { token: first.token })).status, 401);
  const recovered = await request(studioPath, { token: await signIn(reissued.value.code) });
  assert.equal(recovered.value.revision, 2);

  const finalState: StudioState = {
    ...studioFixture,
    lesson: {
      ...studioFixture.lesson,
      note: 'Fictional note',
      noteSaved: true,
      reply: 'Fictional reply',
      replySaved: true,
    },
    progress: Object.fromEntries(studioMissionIds.map((id) => [id, ['run', 'tune', 'audit']])),
    stations: Object.fromEntries(
      studioMissionIds.slice(1).map((id) => [id, { checkpoint: 'practice', introDone: true }]),
    ),
  };
  const completed = await request(studioPath, {
    token: await signIn(reissued.value.code),
    method: 'PUT',
    json: { version: studioVersion, revision: 2, state: finalState },
  });
  assert.equal(completed.status, 200);
  const updatedRoster = await request(studioRoster, { token: instructor });
  const summary = updatedRoster.value.learners.find(
    ({ id }: { id: string }) => id === first.id,
  ).studioProgress;
  assert.equal(summary.completedMissions, 5);
  assert.equal(summary.complete, true);
}

test('scopes studio saves, preserves revisions, and populates the instructor roster', async (t) => {
  const events: unknown[] = [];
  await checkStudioCheckpoint(t, {
    telemetry: { record: (event) => events.push(event), flush: async () => {} },
  });
  assert.deepEqual(events, []);
});

const testPostgresUrl = process.env.COURSE_TEST_POSTGRES_URL;
if (testPostgresUrl)
  test('runs the same studio storage and auth contract on PostgreSQL', async (t) => {
    const url = new URL(testPostgresUrl);
    assert.ok(
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
      'Use a disposable local PostgreSQL database',
    );
    const code = crypto.randomUUID();
    const database = createPostgresDatabase(url.toString(), {
      courseId: crypto.randomUUID(),
      label: 'Synthetic instructor',
      code,
    });
    const events: unknown[] = [];
    await checkStudioCheckpoint(
      t,
      {
        database,
        production: true,
        telemetry: { record: (event) => events.push(event), flush: async () => {} },
      },
      code,
    );
    assert.deepEqual(events, [
      { name: 'week_started' },
      ...studioMissionIds.map((mission) => ({ name: 'mission_completed', mission })),
      { name: 'week_completed' },
    ]);
    assert.equal(
      (await database.query<{ name: string }>('SELECT current_schema() AS name').get())?.name,
      'course_game',
    );

    // The storage switch also backs the existing lab budget reservation.
    const runLab = createLab({
      db: database,
      enabled: true,
      apiKey: 'mock-key',
      fetchImpl: async () =>
        Response.json({
          status: 'completed',
          usage: { input_tokens: 10, output_tokens: 8 },
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: 'Synthetic test reply' }],
            },
          ],
        }),
    });
    assert.equal((await runLab(crypto.randomUUID(), 'answer')).source, 'generated');
  });
