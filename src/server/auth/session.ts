import type { Database, Queries } from '../database.ts';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Account } from '../types.ts';
import { reject, textField } from '../http.ts';
import { digest, newCode } from './codes.ts';
const sessionLifetime = 30 * 24 * 60 * 60 * 1_000;

const localCoursePrefix = 'local-practice:';

export function isScriptedCourse(id: string) {
  return id === 'demo' || id === 'other-demo' || id.startsWith(localCoursePrefix);
}

export function sessionProfile(account: Account, demoRunsEnabled: boolean) {
  return {
    role: account.role,
    label: account.label,
    accountKey: digest('course-game/' + account.id),
    canStartDemoRun: demoRunsEnabled && account.role === 'learner',
  };
}

export function sessions(db: Database) {
  const findAccount = db.query<Account, [string, number]>(`
    SELECT accounts.* FROM accounts JOIN sessions ON accounts.id = sessions.account_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `);

  async function issueSession(tx: Queries, account: Account, demoRunsEnabled: boolean) {
    const token = randomBytes(32).toString('base64url');
    await tx.run(
      'INSERT INTO sessions VALUES (?, ?, ?)',
      digest(token),
      account.id,
      Date.now() + sessionLifetime,
    );
    return { token, ...sessionProfile(account, demoRunsEnabled) };
  }

  // The learner and session are committed together. The private code is never issued.
  const startDemoRun = () =>
    db.transaction('create-demo-run', async (tx) => {
      const id = randomUUID();
      const account: Account = {
        id,
        course_id: localCoursePrefix + id,
        role: 'learner',
        label: 'Practice learner',
      };
      await tx.run(
        'INSERT INTO accounts (id, course_id, role, label, code_hash) VALUES (?, ?, ?, ?, ?)',
        account.id,
        account.course_id,
        account.role,
        account.label,
        digest(newCode()),
      );
      return issueSession(tx, account, true);
    });

  const failures = new Map<string, { count: number; expires: number }>();
  return {
    startDemoRun,
    async signIn(code: unknown, source: string, demoRunsEnabled: boolean) {
      const now = Date.now();
      for (const [key, entry] of failures) if (entry.expires <= now) failures.delete(key);
      if ((failures.get(source)?.count ?? 0) >= 20)
        reject(429, 'Too many attempts. Try again in five minutes.', 'too-many-attempts');
      const account = textField(code, 256)
        ? await db
            .query<Account, [string]>('SELECT * FROM accounts WHERE code_hash = ?')
            .get(digest(code.trim()))
        : undefined;
      if (!account) {
        const entry = failures.get(source) ?? { count: 0, expires: now + 300_000 };
        failures.set(source, { ...entry, count: entry.count + 1 });
        reject(401, 'This access code could not be verified.', 'invalid-code');
      }
      failures.delete(source);
      return db.transaction('account:' + account.id, async (tx) => {
        const valid = await tx
          .query<Account>('SELECT * FROM accounts WHERE id = ? AND code_hash = ?')
          .get(account.id, digest((code as string).trim()));
        if (!valid) reject(401, 'This access code could not be verified.', 'invalid-code');
        await tx.run('DELETE FROM sessions WHERE expires_at <= ?', now);
        return issueSession(tx, valid, demoRunsEnabled);
      });
    },
    async authenticate(header: string | undefined) {
      const token = /^Bearer ([\w-]{43})$/.exec(header ?? '')?.[1];
      if (!token) reject(401, 'Enter your access code to continue.', 'unauthorized');
      const account = await findAccount.get(digest(token), Date.now());
      if (!account) reject(401, 'Enter your access code to continue.', 'unauthorized');
      return { account, token };
    },
    revoke(token: string) {
      return db.run('DELETE FROM sessions WHERE token_hash = ?', digest(token));
    },
  };
}
