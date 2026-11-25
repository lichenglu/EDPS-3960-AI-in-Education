import type { Database, Queries } from '../database.ts';
import {
  weekOneVersion,
  type WeekOneAction,
  type WeekOneArchive,
  type WeekOneCheckpoint,
  type WeekOneProgress,
} from '../../contracts/week-one.ts';
import { reject } from '../http.ts';
import type { ActiveQuest } from '../types.ts';
import { independentFeedback, transferReplay } from './feedback.ts';
import { summarize } from './legacy.ts';
import { transition } from './transition.ts';

type Stored = { state: string; revision: number; lastSaved: string };
const questId = 'w01';

export function weekOneStore(db: Database, quest: ActiveQuest) {
  const atVersion = (connection: Queries, learner: string, version: string) =>
    connection
      .query<Stored>(
        `
    SELECT state, revision, last_saved AS "lastSaved" FROM progress
    WHERE account_id = ? AND quest_id = 'w01' AND quest_version = ?
  `,
      )
      .get(learner, version);

  async function archive(learner: string, version: string): Promise<WeekOneArchive> {
    const row = (version === '1' || version === '2') && (await atVersion(db, learner, version));
    if (!row) reject(404, 'This earlier Week 1 record is unavailable.', 'archive-unavailable');
    return {
      questId,
      contentVersion: version,
      revision: row.revision,
      lastSaved: row.lastSaved,
      state: JSON.parse(row.state),
    };
  }

  async function progress(learner: string, connection: Queries = db): Promise<WeekOneCheckpoint> {
    const archivedVersions = (
      await connection
        .query<{ version: string }>(
          `
      SELECT quest_version AS version FROM progress WHERE account_id = ? AND quest_id = 'w01'
      AND quest_version IN ('1', '2') ORDER BY quest_version DESC
    `,
        )
        .all(learner)
    ).map((row) => row.version);
    const row = await atVersion(connection, learner, weekOneVersion);
    const state: WeekOneProgress = row ? JSON.parse(row.state) : { index: 0, entries: {} };
    const first = state.entries.recommendation;
    const hasReplay = state.entries['response-lab']?.replay;
    return {
      questId,
      contentVersion: weekOneVersion,
      revision: row?.revision ?? 0,
      lastSaved: row?.lastSaved ?? null,
      state,
      ...(archivedVersions.length > 0 && { archivedVersions }),
      ...(first?.first && {
        unlocked: {
          feedback: independentFeedback,
          ...(hasReplay && first.rule && { replay: transferReplay[first.rule] }),
        },
      }),
    };
  }

  function commit(learner: string, action: WeekOneAction, hasReply: boolean) {
    return db.transaction('archive-w01:' + learner, async (tx) => {
      const { contentVersion, actionId, expectedRevision, intent } = action;
      const fingerprint = JSON.stringify(intent);
      const receipt = await tx
        .query<{ intent: string; checkpoint: string }>(
          `
        SELECT intent, checkpoint FROM action_receipts WHERE account_id = ? AND quest_id = 'w01'
        AND content_version = ? AND action_id = ?
      `,
        )
        .get(learner, contentVersion, actionId);
      if (receipt) {
        if (receipt.intent !== fingerprint)
          reject(409, 'This action ID was used for a different move.', 'action-id-reused');
        return JSON.parse(receipt.checkpoint) as WeekOneCheckpoint;
      }
      if (contentVersion !== weekOneVersion)
        reject(
          409,
          'This quest has changed. Reload your record and review your draft.',
          'stale-content-version',
        );
      const prior = await progress(learner, tx);
      if (expectedRevision !== prior.revision)
        reject(
          409,
          'A newer checkpoint was saved. Reload your record and review your draft.',
          'stale-revision',
        );
      const state = transition(quest, prior.state, intent, hasReply);
      const lastSaved = new Date().toISOString();
      await tx.run(
        `
        INSERT INTO progress (account_id, quest_id, quest_version, revision, state, stage_status, last_saved)
        VALUES (?, 'w01', ?, ?, ?, ?, ?)
        ON CONFLICT(account_id, quest_id, quest_version) DO UPDATE SET revision = excluded.revision,
          state = excluded.state, stage_status = excluded.stage_status, last_saved = excluded.last_saved
      `,
        learner,
        weekOneVersion,
        prior.revision + 1,
        JSON.stringify(state),
        JSON.stringify(summarize(quest, state, lastSaved)),
        lastSaved,
      );
      const checkpoint = await progress(learner, tx);
      await tx.run(
        'INSERT INTO action_receipts VALUES (?, ?, ?, ?, ?, ?)',
        learner,
        questId,
        contentVersion,
        actionId,
        fingerprint,
        JSON.stringify(checkpoint),
      );
      return checkpoint;
    });
  }
  return { archive, progress, commit };
}
