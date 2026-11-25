import { SQL } from 'bun';
import { Database as SQLite } from 'bun:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { digest } from './auth/codes.ts';
const schema = (labId: string) => `
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY, course_id TEXT NOT NULL, role TEXT NOT NULL,
      label TEXT NOT NULL, code_hash TEXT UNIQUE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS accounts_course_role ON accounts (course_id, role);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
      expires_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_account ON sessions (account_id);
    CREATE TABLE IF NOT EXISTS progress (
      account_id TEXT NOT NULL REFERENCES accounts(id), quest_id TEXT NOT NULL,
      quest_version TEXT NOT NULL, revision INTEGER NOT NULL,
      state TEXT NOT NULL, stage_status TEXT NOT NULL, last_saved TEXT NOT NULL,
      PRIMARY KEY (account_id, quest_id, quest_version)
    );
    CREATE TABLE IF NOT EXISTS action_receipts (
      account_id TEXT NOT NULL REFERENCES accounts(id), quest_id TEXT NOT NULL,
      content_version TEXT NOT NULL, action_id TEXT NOT NULL, intent TEXT NOT NULL,
      checkpoint TEXT NOT NULL, PRIMARY KEY(account_id, quest_id, content_version, action_id)
    );
    CREATE TABLE IF NOT EXISTS bottles (
      id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
      quest_id TEXT NOT NULL, quest_version TEXT NOT NULL, text TEXT NOT NULL,
      created_at TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0,
      UNIQUE (account_id, quest_id, quest_version)
    );
    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
      quest_id TEXT NOT NULL, quest_version TEXT NOT NULL, bottle_id TEXT REFERENCES bottles(id),
      text TEXT NOT NULL, created_at TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_reply_per_bottle
      ON replies (account_id, quest_id, quest_version, COALESCE(bottle_id, ''));
    CREATE TABLE IF NOT EXISTS lab_usage (
      id ${labId},
      learner_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      cost_nanos BIGINT NOT NULL CHECK (cost_nanos >= 0)
    );
    CREATE INDEX IF NOT EXISTS lab_usage_week ON lab_usage(learner_id, week_start);
`;

type Bind = (string | number | null)[];
type Result = { changes: number };
export interface Queries {
  query<T, A extends Bind = Bind>(
    statement: string,
  ): {
    all(...values: A): Promise<T[]>;
    get(...values: A): Promise<T | undefined>;
  };
  run(statement: string, ...values: Bind): Promise<Result>;
}
export interface Database extends Queries {
  ready: Promise<void>;
  transaction<T>(key: string, task: (tx: Queries) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new SQLite(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  db.exec(schema('INTEGER PRIMARY KEY'));
  const seed = db.prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING');
  for (const [id, course, role, label, code] of [
    ['demo-1', 'demo', 'learner', 'Learner 01', 'DEMO-LEARNER'],
    ['demo-2', 'demo', 'learner', 'Learner 02', 'DEMO-PEER'],
    ['demo-staff', 'demo', 'instructor', 'Demo instructor', 'DEMO-INSTRUCTOR'],
    ['other-1', 'other-demo', 'learner', 'Other course learner', 'DEMO-OTHER-LEARNER'],
    ['other-staff', 'other-demo', 'instructor', 'Other course instructor', 'DEMO-OTHER-INSTRUCTOR'],
  ])
    seed.run(id, course, role, label, digest(code));

  // SQLite has one connection. Keep unrelated queries outside an open transaction.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(task: () => T | Promise<T>) => {
    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
  };
  const direct = async <T>(task: () => T | Promise<T>): Promise<T> => await task();
  function operations(dispatch: typeof enqueue): Queries {
    return {
      query<T, A extends Bind>(statement: string) {
        const query = db.query<T, Bind>(statement);
        return {
          all: (...values: A) => dispatch(() => query.all(...values)),
          get: (...values: A) => dispatch(() => query.get(...values) ?? undefined),
        };
      },
      run: (statement, ...values) => dispatch(() => db.query(statement).run(...values)),
    };
  }
  return {
    ...operations(enqueue),
    ready: Promise.resolve(),
    transaction: (_key, task) =>
      enqueue(async () => {
        db.exec('BEGIN IMMEDIATE');
        try {
          const result = await task(operations(direct));
          db.exec('COMMIT');
          return result;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      }),
    async close() {
      await queue;
      db.close();
    },
  };
}

export type StaffBootstrap = { courseId: string; label: string; code: string };

export function createPostgresDatabase(url: string, staff?: StaffBootstrap, caFile?: string): Database {
  const sql = new SQL({
    url,
    connectionTimeout: 8,
    max: 5,
    connection: { options: '--search_path=course_game,pg_catalog' },
    ...(caFile && { tls: { ca: readFileSync(caFile, 'utf8'), rejectUnauthorized: true } }),
  });
  function operations(client: SQL): Queries {
    function execute<T>(statement: string, values: Bind) {
      let index = 0;
      // Queries in this layer are static SQL. User values are always bound.
      return client.unsafe<T[]>(
        statement.replaceAll('?', () => '$' + ++index),
        values,
      );
    }
    return {
      query<T, A extends Bind>(statement: string) {
        return {
          all: async (...values: A): Promise<T[]> => await execute<T>(statement, values),
          get: async (...values: A): Promise<T | undefined> => (await execute<T>(statement, values))[0],
        };
      },
      run: async (statement, ...values) => ({ changes: (await execute(statement, values)).count }),
    };
  }
  const ready = sql
    .begin(async (client) => {
      await client`SELECT pg_advisory_xact_lock(hashtextextended('course-game-schema', 0))`;
      await client.unsafe('CREATE SCHEMA IF NOT EXISTS course_game').simple();
      const [scope] = await client<{ schema: string }[]>`SELECT current_schema() AS schema`;
      if (scope?.schema !== 'course_game')
        throw new Error('Database connection did not select the course schema.');
      await client.unsafe('REVOKE ALL ON SCHEMA course_game FROM PUBLIC').simple();
      await client.unsafe(schema('BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY')).simple();
      if (staff)
        await operations(client).run(
          'INSERT INTO accounts (id, course_id, role, label, code_hash) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING',
          'staff:' + staff.courseId,
          staff.courseId,
          'instructor',
          staff.label,
          digest(staff.code),
        );
    })
    .then(() => undefined);

  return {
    ...operations(sql),
    ready,
    transaction: (key, task) =>
      sql.begin(async (client) => {
        await client`SELECT pg_advisory_xact_lock(hashtextextended(${key}::text, 0))`;
        return task(operations(client));
      }),
    async close() {
      await sql.close({ timeout: 5 });
    },
  };
}
