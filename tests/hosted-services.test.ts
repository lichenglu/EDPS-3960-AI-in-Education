import assert from 'node:assert/strict';
import test from 'node:test';
import { hostedConfig } from '../src/server/hosted-config.ts';
import { studioTelemetry } from '../src/server/telemetry.ts';

test('development ignores hosted service settings and production validates TLS and analytics', () => {
  const env = {
    GAME_STORAGE: 'supabase',
    SUPABASE_DATABASE_URL: 'postgresql://example.invalid/course',
    GAME_POSTHOG_ENABLED: '1',
    POSTHOG_PROJECT_TOKEN: 'fixture-token',
    POSTHOG_HOST: 'https://eu.i.posthog.com',
  };
  const dev = hostedConfig({ ...env, GAME_RUNTIME: 'development' });
  assert.equal(dev.dbUrl, undefined);
  assert.equal(dev.telemetry, undefined);
  const prod = hostedConfig({ ...env, GAME_RUNTIME: 'production' });
  assert.equal(new URL(prod.dbUrl!).searchParams.get('sslmode'), 'verify-full');
  assert.deepEqual(prod.telemetry, { token: 'fixture-token', host: env.POSTHOG_HOST });
  assert.equal(
    hostedConfig({ ...env, GAME_RUNTIME: 'production', GAME_POSTHOG_ENABLED: '0' }).telemetry,
    undefined,
  );
  assert.throws(() =>
    hostedConfig({ ...env, GAME_RUNTIME: 'production', POSTHOG_HOST: 'https://example.invalid' }),
  );
  assert.throws(() =>
    hostedConfig({
      ...env,
      GAME_RUNTIME: 'production',
      SUPABASE_DATABASE_URL: env.SUPABASE_DATABASE_URL + '?sslmode=disable',
    }),
  );
});

test('PostHog requests include only the anonymous event contract and never forward caller fields', async () => {
  const sent: {
    endpoint: string;
    init: RequestInit;
    event: { uuid: string; distinct_id: string; options: object; properties: object };
  }[] = [];
  const fetchImpl = (async (endpoint: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const event = body.batch[0];
    assert.ok(Date.parse(body.created_at));
    sent.push({ endpoint, init, event });
    return Response.json({ results: { [event.uuid]: { result: 'ok' } } });
  }) as typeof fetch;
  const disabled = studioTelemetry({ fetchImpl });
  disabled.record({ name: 'week_started' });
  await disabled.flush();
  assert.equal(sent.length, 0);

  const enabled = studioTelemetry({ token: 'fixture-token', host: 'https://eu.i.posthog.com', fetchImpl });
  const extra = {
    name: 'mission_completed' as const,
    mission: 'reading' as const,
    account: 'fetch must not receive this',
  };
  enabled.record(extra);
  enabled.record({ name: 'week_started' });
  await enabled.flush();
  assert.equal(sent.length, 2);
  const [first, second] = sent;
  const headers = new Headers(first.init.headers);
  assert.equal(first.endpoint, 'https://eu.i.posthog.com/i/v1/analytics/events');
  assert.equal(headers.get('authorization'), 'Bearer fixture-token');
  assert.equal(headers.get('posthog-attempt'), '1');
  assert.ok(headers.get('posthog-request-id'));
  assert.ok(headers.get('posthog-request-timestamp'));
  assert.ok(headers.get('posthog-sdk-info'));
  assert.ok(headers.get('user-agent'));
  assert.deepEqual(first.event.options, { process_person_profile: false });
  assert.deepEqual(first.event.properties, {
    $geoip_disable: true,
    week: 'w01',
    version: 'studio-1',
    mission: 'reading',
  });
  assert.notEqual(first.event.distinct_id, second.event.distinct_id);
  assert.ok(!JSON.stringify(first.event).includes(extra.account));
});
