import { labNotice, labReplies, labRequest } from '../../curriculum/week-one.ts';
import type { Database } from '../database.ts';

export type LabMode = 'answer' | 'hint';
export type LabReply = { text: string; source: 'generated' | 'scripted' };
export type LabFetch = (
  url: string,
  options: {
    method: 'POST';
    headers: { Authorization: string; 'Content-Type': 'application/json' };
    redirect: 'error';
    signal: AbortSignal;
    body: string;
  },
) => Promise<Response>;

export interface LabOptions {
  db?: Database;
  enabled?: boolean;
  apiKey?: string;
  fetchImpl?: LabFetch;
  budgetCents?: number;
  now?: () => Date;
}

interface ProviderResponse {
  status?: unknown;
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
  output?: { type: string; role?: string; content?: { type: string; text?: unknown }[] }[];
}

const CASE = labNotice + ' ' + labRequest;
const instructions: Record<LabMode, string> = {
  answer: 'Write one short corrected sign for visitors. Use the location in the organizer’s notice.',
  hint: 'Ask the volunteer one short question that helps them check their draft against the source. Let the volunteer identify the correct location.',
};

// Store whole nanodollars to reserve and settle each call without rounding down.
const INPUT_PRICE = 750;
const OUTPUT_PRICE = 4500;
const MAX_INPUT = 3000;
const MAX_OUTPUT = 800;
const MAX_COST = MAX_INPUT * INPUT_PRICE + MAX_OUTPUT * OUTPUT_PRICE;
const MAX_BUDGET_CENTS = 40000;
const CALLS_PER_WEEK = 10;
const mountainDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function weekStart(date: Date) {
  const parts = Object.fromEntries(mountainDate.formatToParts(date).map(({ type, value }) => [type, value]));
  const monday = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function fallbackFor(mode: LabMode): LabReply {
  if (mode !== 'answer' && mode !== 'hint') throw new RangeError('Unknown lab option.');
  return { text: labReplies[mode], source: 'scripted' };
}

function tokenCount(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
}

export function createLab({
  db,
  enabled = false,
  apiKey,
  fetchImpl = globalThis.fetch,
  budgetCents = MAX_BUDGET_CENTS,
  now = () => new Date(),
}: LabOptions = {}) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  const budget = Number.isSafeInteger(budgetCents) ? Math.min(budgetCents, MAX_BUDGET_CENTS) * 1e7 : 0;
  if (!enabled || !key || !db || budget < MAX_COST) {
    return async (_learnerId: string | number, mode: LabMode) => fallbackFor(mode);
  }

  const reserve = `
    INSERT INTO lab_usage (learner_id, week_start, cost_nanos)
    SELECT ?, ?, ?
    WHERE (SELECT COALESCE(SUM(cost_nanos), 0) FROM lab_usage) <= ?
      AND (SELECT COUNT(*) FROM lab_usage WHERE learner_id = ? AND week_start = ?) < ?
    RETURNING id
  `;

  return async (learnerId: string | number, mode: LabMode): Promise<LabReply> => {
    const fallback = fallbackFor(mode);
    if (typeof learnerId !== 'string' && !Number.isSafeInteger(learnerId)) return fallback;
    const learner = String(learnerId);
    if (!learner.trim()) return fallback;

    try {
      // Serialize budget reservations across Postgres workers.
      const week = weekStart(now());
      const reservation = await db.transaction('lab-budget', (tx) =>
        tx
          .query<{ id: number | string }>(reserve)
          .get(learner, week, MAX_COST, budget - MAX_COST, learner, week, CALLS_PER_WEEK),
      );
      if (!reservation) return fallback;

      const response = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          model: 'gpt-5.4-mini-2026-03-17',
          instructions: instructions[mode],
          input: CASE,
          max_output_tokens: MAX_OUTPUT,
          reasoning: { effort: 'none' },
          store: false,
        }),
      });
      if (!response.ok) return fallback;

      const result = (await response.json()) as ProviderResponse | null;
      const { input_tokens: input, output_tokens: output } = result?.usage ?? {};
      // Keep the full reservation if the API does not report a known cost.
      if (tokenCount(input, MAX_INPUT) && tokenCount(output, MAX_OUTPUT)) {
        await db.run(
          'UPDATE lab_usage SET cost_nanos = ? WHERE id = ?',
          input * INPUT_PRICE + output * OUTPUT_PRICE,
          reservation.id,
        );
      }
      if (result?.status !== 'completed') return fallback;

      const message = result.output?.find((item) => item.type === 'message' && item.role === 'assistant');
      const reply = message?.content?.find((item) => item.type === 'output_text')?.text;
      const text = typeof reply === 'string' ? reply.trim() : '';
      return text && text.length <= 500 ? { text, source: 'generated' } : fallback;
    } catch {
      return fallback;
    }
  };
}
