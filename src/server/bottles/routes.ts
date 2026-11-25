import type { Database } from '../database.ts';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { body, json, reject, textField } from '../http.ts';
import type { Account, ActiveQuest, Bottle } from '../types.ts';

export function bottleRoutes(
  db: Database,
  currentQuest: (id: string) => ActiveQuest,
  allow: (id: string, account: Account) => Promise<void>,
) {
  const findOwnBottle = db.query<Bottle, [string, string, string]>(`
    SELECT id, text FROM bottles WHERE account_id = ? AND quest_id = ? AND quest_version = ?
  `);
  async function getBottles(account: Account, questId: string, version: string) {
    const own = (await findOwnBottle.get(account.id, questId, version)) ?? null;
    if (!own) return { own, next: null, replies: [], responded: false };

    const next =
      (await db
        .query(
          `
      SELECT b.id, b.text, a.label
      FROM bottles b JOIN accounts a ON b.account_id = a.id
      WHERE a.course_id = ? AND b.quest_id = ? AND b.quest_version = ?
        AND b.account_id <> ? AND b.hidden = 0
      ORDER BY EXISTS (SELECT 1 FROM replies r
                       WHERE r.bottle_id = b.id AND r.account_id = ? AND r.hidden = 0) DESC,
               (SELECT COUNT(*) FROM replies r WHERE r.bottle_id = b.id AND r.hidden = 0),
               b.created_at, b.id
      LIMIT 1
    `,
        )
        .get(account.course_id, questId, version, account.id, account.id)) ?? null;
    const replies = await db
      .query(
        `
      SELECT a.label, r.text FROM replies r JOIN accounts a ON r.account_id = a.id
      WHERE r.bottle_id = ? AND r.hidden = 0 ORDER BY r.created_at, r.id
    `,
      )
      .all(own.id);
    const responded = Boolean(
      await db
        .query(
          `
      SELECT 1 FROM replies WHERE account_id = ? AND quest_id = ? AND quest_version = ? LIMIT 1
    `,
        )
        .get(account.id, questId, version),
    );
    return { own, next, replies, responded };
  }

  async function handleBottle(
    request: IncomingMessage,
    response: ServerResponse,
    match: readonly string[],
    account: Account,
    target?: { bottleId: string | null },
  ) {
    const [, questId, reply] = match;
    await allow(questId, account);
    const quest = currentQuest(questId);
    if (!quest.steps.some((step) => step.type === 'bottle')) {
      reject(404, 'This quest has no Drift Bottle activity.');
    }
    const version = String(quest.version);
    if (request.method === 'GET' && !reply) {
      const exchange = await getBottles(account, questId, version);
      const sentReplies = await db
        .query<{ text: string }, [string, string, string]>(
          `
        SELECT r.text FROM replies r LEFT JOIN bottles b ON b.id = r.bottle_id
        WHERE r.account_id = ? AND r.quest_id = ? AND r.quest_version = ? AND r.hidden = 0
          AND (r.bottle_id IS NULL OR b.hidden = 0)
        ORDER BY r.created_at, r.id
      `,
        )
        .all(account.id, questId, version);
      return json(response, 200, { ...exchange, sentReplies });
    }
    if (request.method !== 'POST') reject(404, 'The requested action could not be found.');

    const message = await body(request);
    const { text } = message;
    const bottleId = target ? target.bottleId : message.bottleId;
    if (!textField(text, 1_200)) reject(400, 'Write a message of 1–1,200 characters.');
    const timestamp = new Date().toISOString();
    if (!reply) {
      await db.run(
        `
        INSERT INTO bottles (id, account_id, quest_id, quest_version, text, created_at)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
      `,
        randomUUID(),
        account.id,
        questId,
        version,
        text.trim(),
        timestamp,
      );
    } else {
      if (!(await findOwnBottle.get(account.id, questId, version)))
        reject(403, 'Send your own bottle before replying.');
      if (bottleId !== null) {
        if (typeof bottleId !== 'string') reject(400, 'Choose a bottle to reply to.');
        const canReply = await db
          .query(
            `
          SELECT 1 FROM bottles b JOIN accounts a ON b.account_id = a.id
          WHERE b.id = ? AND a.course_id = ? AND b.quest_id = ? AND b.quest_version = ?
            AND b.account_id <> ? AND b.hidden = 0
        `,
          )
          .get(bottleId, account.course_id, questId, version, account.id);
        if (!canReply) reject(404, 'That bottle is unavailable. Open another or use the example.');
      }
      await db.run(
        `
        INSERT INTO replies (id, account_id, quest_id, quest_version, bottle_id, text, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
      `,
        randomUUID(),
        account.id,
        questId,
        version,
        bottleId,
        text.trim(),
        timestamp,
      );
    }
    return json(response, 200, await getBottles(account, questId, version));
  }
  return { getBottles, handleBottle };
}
