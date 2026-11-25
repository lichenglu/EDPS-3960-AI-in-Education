import type { Database } from '../database.ts';
import { weekTwoQuestId } from '../../contracts/week-two.ts';
import { summarizeWeekTwo } from '../progress/week-two.ts';
import { studioQuestId, studioVersion } from '../../contracts/studio.ts';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { body, json, reject, textField } from '../http.ts';
import { digest, newCode } from '../auth/codes.ts';
import type { Account, QuestCatalog, RosterLearner, StageRow } from '../types.ts';

export function instructorRoutes(db: Database, questCatalog: QuestCatalog) {
  return async function handleInstructor(
    request: IncomingMessage,
    response: ServerResponse,
    path: string,
    account: Account,
  ) {
    const method = request.method;
    if (path === '/api/roster' && method === 'GET') {
      const learners = await db
        .query<RosterLearner, [string]>(
          `
        SELECT id, label FROM accounts WHERE course_id = ? AND role = 'learner' ORDER BY label, id
      `,
        )
        .all(account.course_id);
      const accountProgress = db.query<
        StageRow & { timeline: string | null; saved: string },
        [string, string]
      >(`
        SELECT quest_id, quest_version, stage_status, last_saved AS saved,
          CASE WHEN quest_id = ? THEN state END AS timeline
        FROM progress WHERE account_id = ?
      `);
      const roster = await Promise.all(
        learners.map(async (learner) => {
          const rows = await accountProgress.all(weekTwoQuestId, learner.id);
          const studio = rows.find(
            (row) => row.quest_id === studioQuestId && row.quest_version === studioVersion,
          );
          return {
            ...learner,
            progress: Object.fromEntries(
              rows
                .filter(
                  (row) =>
                    Object.hasOwn(questCatalog, row.quest_id) &&
                    String(questCatalog[row.quest_id].version) === row.quest_version,
                )
                .map((row) => [
                  row.quest_id,
                  // Derive the current stage for records saved when the first two years belonged to I Do.
                  row.timeline
                    ? summarizeWeekTwo(JSON.parse(row.timeline), row.saved)
                    : JSON.parse(row.stage_status),
                ]),
            ),
            ...(studio && { studioProgress: JSON.parse(studio.stage_status) }),
          };
        }),
      );
      return json(response, 200, { learners: roster });
    }
    if (path === '/api/roster' && method === 'POST') {
      const { label } = await body(request);
      if (!textField(label, 60)) reject(400, 'Enter a short roster label.');
      const id = randomUUID();
      const code = newCode();
      await db.run(
        'INSERT INTO accounts VALUES (?, ?, ?, ?, ?)',
        id,
        account.course_id,
        'learner',
        label.trim(),
        digest(code),
      );
      return json(response, 201, { id, label: label.trim(), code });
    }
    const reissue = /^\/api\/roster\/([\w-]+)\/reissue$/.exec(path);
    if (reissue && method === 'POST') {
      const [, id] = reissue;
      const code = newCode();
      await db.transaction('account:' + id, async (tx) => {
        const update = await tx.run(
          `
          UPDATE accounts SET code_hash = ? WHERE id = ? AND course_id = ? AND role = 'learner'
        `,
          digest(code),
          id,
          account.course_id,
        );
        if (!update.changes) reject(404, 'This learner could not be found.');
        await tx.run('DELETE FROM sessions WHERE account_id = ?', id);
      });
      return json(response, 200, { code });
    }
    if (path === '/api/moderation' && method === 'GET') {
      const messages = await db
        .query(
          `
        SELECT b.id AS id, a.label, b.quest_id AS "questId", b.text, b.created_at AS "createdAt", 'bottle' AS kind
        FROM bottles b JOIN accounts a ON b.account_id = a.id
        WHERE a.course_id = ? AND b.hidden = 0
        UNION ALL
        SELECT r.id AS id, a.label, r.quest_id, r.text, r.created_at, 'reply'
        FROM replies r JOIN accounts a ON r.account_id = a.id
        WHERE a.course_id = ? AND r.hidden = 0 AND r.bottle_id IS NOT NULL
        ORDER BY "createdAt" DESC, id
      `,
        )
        .all(account.course_id, account.course_id);
      return json(response, 200, { messages });
    }
    const moderate = /^\/api\/moderation\/([\w-]+)$/.exec(path);
    if (moderate && method === 'DELETE') {
      for (const table of ['bottles', 'replies']) {
        const result = await db.run(
          `
          UPDATE ${table} SET hidden = 1
          WHERE id = ? AND account_id IN (SELECT id FROM accounts WHERE course_id = ?)
        `,
          moderate[1],
          account.course_id,
        );
        if (result.changes) return json(response, 200, { hidden: true });
      }
      reject(404, 'This message could not be found.');
    }
    reject(404, 'The requested action could not be found.');
  };
}
