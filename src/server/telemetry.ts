import { randomUUIDv7 } from 'bun';
import { randomUUID } from 'node:crypto';
import { studioQuestId, studioVersion, type StudioMission } from '../contracts/studio.ts';

export type StudioEvent =
  | { name: 'week_started' | 'week_completed' | 'checkpoint_save_failed' }
  | { name: 'mission_completed'; mission: StudioMission };
export type RecordStudioEvent = (event: StudioEvent) => void;
type TelemetryOptions = { token?: string; host?: string; fetchImpl?: typeof fetch };

export function studioTelemetry({
  token,
  host = 'https://us.i.posthog.com',
  fetchImpl = fetch,
}: TelemetryOptions = {}) {
  const pending = new Set<Promise<void>>();
  const flush = async () => {
    await Promise.all(pending);
  };
  if (!token) return { record: (_event: StudioEvent) => {}, flush };
  const endpoint = host + '/i/v1/analytics/events';

  const record: RecordStudioEvent = (event) => {
    if (pending.size >= 25) return;
    // Each event has a fresh, unlinkable ID. Only categorical fields cross this boundary.
    const timestamp = new Date().toISOString();
    const payload = {
      event: event.name,
      uuid: randomUUIDv7(),
      distinct_id: randomUUID(),
      timestamp,
      options: { process_person_profile: false },
      properties: {
        $geoip_disable: true,
        week: studioQuestId,
        version: studioVersion,
        ...(event.name === 'mission_completed' && { mission: event.mission }),
      },
    };
    const request = Promise.resolve()
      .then(() =>
        fetchImpl(endpoint, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(3000),
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            'User-Agent': 'edps-course-game/1.0',
            'PostHog-Sdk-Info': 'edps-course-game/1.0.0',
            'PostHog-Request-Id': randomUUID(),
            'PostHog-Attempt': '1',
            'PostHog-Request-Timestamp': timestamp,
          },
          body: JSON.stringify({ created_at: timestamp, batch: [payload] }),
        }),
      )
      .then(async (response) => {
        if (!response.ok) throw new Error('PostHog capture failed');
        const { results } = (await response.json()) as { results?: Record<string, { result: string }> };
        const result = results?.[payload.uuid]?.result;
        if (result !== 'ok' && result !== 'warning') throw new Error('PostHog did not accept an event');
      })
      .catch(() => {
        console.warn('A course analytics event could not be delivered.');
      })
      .finally(() => {
        pending.delete(request);
      });
    pending.add(request);
  };

  return { record, flush };
}
