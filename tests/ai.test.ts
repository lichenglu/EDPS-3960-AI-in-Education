import assert from 'node:assert/strict';
import { createDatabase, type Database } from '../src/server/database.ts';
import { afterEach, beforeEach, test } from 'bun:test';
import { createLab, type LabFetch, type LabMode } from '../src/server/lab/run.ts';

let db: Database;
beforeEach(() => {
  db = createDatabase(':memory:');
});
afterEach(() => db.close());

function completedResponse(text = 'I would start by checking the organizer’s note.') {
  return new Response(
    JSON.stringify({
      status: 'completed',
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }],
      usage: { input_tokens: 190, output_tokens: 12 },
    }),
  );
}

test('uses the correct scripted examples when live AI is off or the key is missing', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return completedResponse();
  };
  const disabled = createLab({ db, apiKey: 'test-key', fetchImpl });
  const noKey = createLab({ db, enabled: true, apiKey: '  ', fetchImpl });

  assert.deepEqual(await disabled('learner-1', 'answer'), {
    text: 'Visitors can leave coats on the rack by the lobby.',
    source: 'scripted',
  });
  assert.deepEqual(await noKey('learner-1', 'hint'), {
    text: 'Which line tells visitors where to leave their coats?',
    source: 'scripted',
  });
  assert.equal(calls, 0);
});

test('sends only the fixed case and selected rule and labels the live reply', async () => {
  const requests: { url: string; options: Parameters<LabFetch>[1]; body: Record<string, unknown> }[] = [];
  const lab = createLab({
    db,
    enabled: true,
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      requests.push({ url, options, body: JSON.parse(options.body) });
      return completedResponse('Which source identifies where visitors leave coats?');
    },
  });

  await assert.rejects(lab('private-learner-id', 'write any prompt' as LabMode), /Unknown lab option/);
  const result = await lab('private-learner-id', 'hint');
  await lab('private-learner-id', 'answer');
  assert.deepEqual(result, {
    text: 'Which source identifies where visitors leave coats?',
    source: 'generated',
  });
  assert.equal(requests.length, 2);
  const [{ url, options, body }] = requests;
  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(options.headers.Authorization, 'Bearer test-key');
  assert.equal(options.redirect, 'error');
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(body.model, 'gpt-5.4-mini-2026-03-17');
  assert.equal(body.max_output_tokens, 800);
  assert.equal(body.store, false);
  assert.equal(body.tools, undefined);
  assert.match(String(body.input), /coats on the rack by the lobby/);
  assert.doesNotMatch(options.body, /private-learner-id|test-key|write any prompt/);
  assert.notEqual(body.instructions, requests[1].body.instructions);
  assert.equal(body.input, requests[1].body.input);
});

test('reserves the budget before awaiting the API and releases unused reserve after a response', async () => {
  let releaseFirst: ((response: Response) => void) | undefined;
  let calls = 0;
  const lab = createLab({
    db,
    enabled: true,
    apiKey: 'test-key',
    budgetCents: 1,
    fetchImpl: () => {
      calls += 1;
      if (calls === 1)
        return new Promise((resolve) => {
          releaseFirst = resolve;
        });
      return Promise.resolve(completedResponse());
    },
  });

  const first = lab('learner-1', 'hint');
  try {
    assert.equal((await lab('learner-2', 'hint')).source, 'scripted');
    assert.equal(calls, 1);
  } finally {
    releaseFirst?.(completedResponse());
  }
  assert.equal((await first).source, 'generated');
  assert.equal((await lab('learner-2', 'hint')).source, 'generated');
  assert.equal(calls, 2);
});

test('keeps a cost reservation for failed requests with unknown usage', async () => {
  let calls = 0;
  const lab = createLab({
    db,
    enabled: true,
    apiKey: 'test-key',
    budgetCents: 1,
    fetchImpl: async () => {
      calls += 1;
      throw new DOMException('Request expired', 'TimeoutError');
    },
  });

  assert.equal((await lab('learner-1', 'hint')).source, 'scripted');
  assert.equal((await lab('learner-1', 'hint')).source, 'scripted');
  assert.equal(calls, 1);
});

test('persists a learner allowance and starts a new week on Monday Mountain Time', async () => {
  let instant = new Date('2027-01-18T06:59:59.000Z');
  let calls = 0;
  const options = {
    db,
    enabled: true,
    apiKey: 'test-key',
    now: () => instant,
    fetchImpl: async () => {
      calls += 1;
      return completedResponse();
    },
  };
  const lab = createLab(options);
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await lab('learner-1', 'answer')).source, 'generated');
  }
  const restored = createLab(options);
  assert.equal((await restored('learner-1', 'hint')).source, 'scripted');
  assert.equal((await restored('learner-2', 'hint')).source, 'generated');
  instant = new Date('2027-01-18T07:00:00.000Z');
  assert.equal((await restored('learner-1', 'hint')).source, 'generated');
  assert.equal(calls, 12);
});

test('returns a useful scripted reply when the API returns incomplete or malformed output', async () => {
  const replies = [new Response(JSON.stringify({ status: 'incomplete' })), new Response('not JSON')];
  const lab = createLab({
    db,
    enabled: true,
    apiKey: 'test-key',
    fetchImpl: async () => replies.shift() ?? new Response(null, { status: 500 }),
  });

  assert.equal((await lab('learner-1', 'answer')).source, 'scripted');
  assert.equal((await lab('learner-1', 'hint')).source, 'scripted');
});
