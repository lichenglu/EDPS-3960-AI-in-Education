import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { quests } from '../curriculum/index.ts';
import { isWeekOneStudioPath } from '../curriculum/studio-route.ts';
import { createLab, type LabOptions } from './lab/run.ts';
import { createDatabase, createPostgresDatabase, type Database } from './database.ts';
import { hostedConfig } from './hosted-config.ts';
import { studioStore } from './progress/studio.ts';
import { studioTelemetry } from './telemetry.ts';
import { studioPath, type StudioConfig } from '../contracts/studio.ts';
import { sessions, sessionProfile, isScriptedCourse } from './auth/session.ts';
import { bottleRoutes } from './bottles/routes.ts';
import { instructorRoutes } from './instructor/routes.ts';
import { contentTypes, frameOrigin, publicRoute } from './assets.ts';
import { body, json, problem, reject, RequestError } from './http.ts';
import type { ActiveQuest, QuestCatalog } from './types.ts';
import { getLegacy, summarize, validateState } from './progress/legacy.ts';
import { parseAction } from './progress/actions.ts';
import { weekOneStore } from './progress/week-one.ts';
import { weekFiveFeedback } from './progress/feedback.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
type GameOptions = {
  dbPath?: string;
  database?: Database;
  production?: boolean;
  studioAccounts?: boolean;
  telemetry?: ReturnType<typeof studioTelemetry>;
  staticDir?: string;
  canvasOrigins?: string[];
  demoRunsEnabled?: boolean;
  aiEnabled?: boolean;
  aiFetch?: LabOptions['fetchImpl'];
  aiKey?: string;
  aiBudgetCents?: number;
  questCatalog?: QuestCatalog;
};

export function createGameServer({
  dbPath = resolve(root, 'data/course.sqlite'),
  staticDir = resolve(root, 'dist'),
  canvasOrigins = [],
  aiEnabled = false,
  aiFetch,
  aiKey,
  aiBudgetCents,
  demoRunsEnabled = false,
  questCatalog = quests,
  database,
  production = false,
  studioAccounts = production,
  telemetry = studioTelemetry(),
}: GameOptions = {}) {
  const origins = [...new Set(canvasOrigins.map(frameOrigin))];
  const db = database ?? createDatabase(dbPath);
  const studio = studioStore(db);
  const runLab = createLab({
    db,
    enabled: aiEnabled,
    apiKey: aiKey,
    fetchImpl: aiFetch,
    budgetCents: aiBudgetCents,
  });
  const scriptedLab = createLab({ enabled: false });
  const auth = sessions(db);
  const handleInstructor = instructorRoutes(db, questCatalog);
  function currentQuest(id: string): ActiveQuest {
    const quest = Object.hasOwn(questCatalog, id) ? questCatalog[id] : undefined;
    if (!quest?.steps?.length) reject(404, 'This quest has no available activities yet.');
    return { ...quest, steps: quest.steps };
  }
  const week = questCatalog.w01?.steps?.length ? weekOneStore(db, currentQuest('w01')) : null;
  const { getBottles, handleBottle } = bottleRoutes(db, currentQuest, async (id, account) => {
    if (id !== 'w01') return;
    const index = currentQuest(id).steps.findIndex((step) => step.type === 'bottle');
    if (!week || index < 0 || (await week.progress(account.id)).state.index < index)
      reject(403, 'Reach the Bottle Shelf before opening the class exchange.');
  });
  let closed: Promise<void> | undefined;

  async function handleApi(request: IncomingMessage, response: ServerResponse, originalPath: string) {
    const method = request.method;
    const peer = request.socket?.remoteAddress;
    const localDemo =
      demoRunsEnabled &&
      Boolean(week) &&
      (peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1');
    const path = originalPath
      .replace(/^\/api\/v1\/session$/, '/api/session')
      .replace(/^\/api\/v1\/instructor\/roster$/, '/api/roster')
      .replace(/^\/api\/v1\/instructor\/learners\/([\w-]+)\/reissue$/, '/api/roster/$1/reissue')
      .replace(/^\/api\/v1\/instructor\/moderation(\/|$)/, '/api/moderation$1')
      .replace(/^\/api\/v1\/quests\/(w\d{2})\/bottles$/, '/api/bottles/$1')
      .replace(/^\/api\/v1\/ai-lab\/runs$/, '/api/lab');
    if (path === studioPath + '/config' && method === 'GET')
      return json(response, 200, {
        requireAccount: studioAccounts,
        localPreview: !production && (peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1'),
      } satisfies StudioConfig);
    await db.ready;
    const demoRun = path === '/api/v1/quests/w01/demo-run';
    if (demoRun && !localDemo) reject(404, 'This local practice option is unavailable.');
    if (path === '/api/session' && method === 'POST') {
      const { code } = await body(request);
      return json(response, 200, await auth.signIn(code, peer ?? 'local', localDemo));
    }
    const { token, account } = await auth.authenticate(request.headers.authorization);
    if (path === '/api/session' && method === 'GET')
      return json(response, 200, sessionProfile(account, localDemo));
    if (path === '/api/session' && method === 'DELETE') {
      await auth.revoke(token);
      return json(response, 200, { signedOut: true });
    }
    if (/^\/api\/(?:roster|moderation)(?:\/|$)/.test(path)) {
      if (account.role !== 'instructor') reject(403, 'Instructor access is required.');
      return handleInstructor(request, response, path, account);
    }
    if (account.role !== 'learner') reject(403, 'Learner access is required.');
    if (demoRun) {
      if (method !== 'POST') reject(405, 'Start a new practice run with a POST request.');
      return json(response, 201, await auth.startDemoRun());
    }
    if (path === studioPath) {
      if (method === 'GET') return json(response, 200, await studio.read(account.id));
      if (method !== 'PUT') reject(405, 'Read or save this studio checkpoint.');
      const { revision, state, version } = await body(request);
      const shouldRecord = production && !isScriptedCourse(account.course_id);
      try {
        const saved = await studio.save(account.id, revision, state, version);
        if (shouldRecord) saved.events.forEach(telemetry.record);
        return json(response, 200, saved.checkpoint);
      } catch (error) {
        if (shouldRecord && !(error instanceof RequestError))
          telemetry.record({ name: 'checkpoint_save_failed' });
        throw error;
      }
    }
    const archiveRoute = /^\/api\/v1\/quests\/w01\/archive\/([^/]+)$/.exec(path);
    if (archiveRoute && week) {
      if (method !== 'GET') reject(405, 'Earlier Week 1 records are read-only.');
      return json(response, 200, await week.archive(account.id, archiveRoute[1]));
    }
    const actionRoute = /^\/api\/v1\/quests\/([^/]+)\/(progress|actions)$/.exec(path);
    if (actionRoute) {
      if (actionRoute[1] !== 'w01' || !week) reject(404, 'This quest has no versioned activities.');
      if (actionRoute[2] === 'progress' && method === 'GET')
        return json(response, 200, await week.progress(account.id));
      if (actionRoute[2] === 'actions' && method === 'POST') {
        const action = parseAction(await body(request));
        const hasReply =
          action.intent.stepId === 'drift-bottle' &&
          (await getBottles(account, 'w01', String(currentQuest('w01').version))).responded;
        return json(response, 200, await week.commit(account.id, action, hasReply));
      }
      reject(405, 'Use the supported method for this quest action.');
    }
    const progressMatch = /^\/api\/progress\/(w\d{2})$/.exec(path);
    if (progressMatch && (method === 'GET' || method === 'PUT')) {
      const questId = progressMatch[1];
      const quest = currentQuest(questId);
      const version = questId === 'w01' ? '1' : String(quest.version);
      const readSaved = async () => {
        const record = await getLegacy(db, account.id, questId, version);
        return questId === 'w05' && record.state?.entries['independent-design']?.first
          ? { ...record, unlocked: { feedback: weekFiveFeedback } }
          : record;
      };
      if (method === 'GET') return json(response, 200, await readSaved());
      if (questId === 'w01')
        reject(410, 'Open the current Week 1 quest to save a move.', 'snapshot-writes-retired');
      const { revision, state } = await body(request);
      if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0)
        reject(400, 'The checkpoint revision is invalid.');
      const saved = await readSaved();
      if (revision !== saved.revision)
        return json(response, 409, { error: 'A newer checkpoint is already saved.', ...saved });
      validateState(quest, saved.state, state);
      const oldIndex = saved.state?.index ?? 0;
      if (
        state.index > oldIndex &&
        quest.steps[oldIndex].type === 'bottle' &&
        !(await getBottles(account, questId, version)).responded
      )
        reject(422, 'Send a bottle and reply before moving on.');
      const lastSaved = new Date().toISOString();
      const summary = summarize(quest, state, lastSaved);
      const stored = await db.run(
        `
        INSERT INTO progress (account_id, quest_id, quest_version, revision, state, stage_status, last_saved)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (account_id, quest_id, quest_version) DO UPDATE SET revision = excluded.revision,
          state = excluded.state, stage_status = excluded.stage_status, last_saved = excluded.last_saved
        WHERE progress.revision = ?
      `,
        account.id,
        questId,
        version,
        revision + 1,
        JSON.stringify(state),
        JSON.stringify(summary),
        lastSaved,
        revision,
      );
      if (!stored.changes)
        return json(response, 409, { error: 'A newer checkpoint is already saved.', ...(await readSaved()) });
      return json(response, 200, await readSaved());
    }
    const bottle = /^\/api\/bottles\/(w\d{2})(\/reply)?$/.exec(path);
    if (bottle && (method === 'GET' || method === 'POST'))
      return handleBottle(request, response, bottle, account);
    const reply = /^\/api\/v1\/bottles\/([\w-]+)\/replies$/.exec(path);
    if (reply && method === 'POST') {
      const id = reply[1];
      const target =
        id === 'example-w01'
          ? { quest_id: 'w01' }
          : await db
              .query<{ quest_id: string }, [string, string]>(
                'SELECT b.quest_id FROM bottles b JOIN accounts a ON a.id = b.account_id WHERE b.id = ? AND a.course_id = ? AND b.hidden = 0',
              )
              .get(id, account.course_id);
      if (!target) reject(404, 'This bottle is unavailable.');
      return handleBottle(request, response, ['', target.quest_id, '/reply'], account, {
        bottleId: id === 'example-w01' ? null : id,
      });
    }
    if (path === '/api/lab' && method === 'POST') {
      const { mode } = await body(request);
      if (mode !== 'answer' && mode !== 'hint') reject(400, 'Select an available lab option.');
      if (!(await week?.progress(account.id))?.state.entries.recommendation?.first)
        reject(403, 'Finish your independent first attempt before trying the lab.');
      // Seeded courses and isolated local runs always use fixed replies.
      const practice = isScriptedCourse(account.course_id) ? scriptedLab : runLab;
      return json(response, 200, await practice(account.id, mode));
    }
    reject(404, 'The requested action could not be found.');
  }

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const framePolicy =
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
      "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'" +
      (origins.length ? ' ' + origins.join(' ') : '');
    response.setHeader('Content-Security-Policy', framePolicy);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');

    let path;
    try {
      path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    } catch {
      reject(400, 'The link could not be read.');
    }
    if (isWeekOneStudioPath(path)) {
      response.setHeader(
        'Content-Security-Policy',
        framePolicy + '; frame-src https://www.youtube-nocookie.com',
      );
    }
    if (path.startsWith('/api/')) return handleApi(request, response, path);
    if (request.method !== 'GET' && request.method !== 'HEAD')
      reject(405, 'This link only supports reading.');
    const [file, status] = publicRoute(questCatalog, path, staticDir);
    if (file) {
      try {
        const content = await readFile(file);
        response.writeHead(status, {
          'Content-Type': contentTypes[extname(file)],
          'Content-Length': content.length,
          'Cache-Control': 'no-cache',
        });
        return response.end(request.method === 'HEAD' ? undefined : content);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT' && code !== 'EISDIR') throw error;
      }
    }
    reject(404, 'This page could not be found.');
  }

  const server = createServer((request, response) => {
    handle(request, response).catch((error) => {
      if (response.headersSent) return response.destroy();
      if (error instanceof RequestError) return problem(response, error);
      return problem(
        response,
        new RequestError(500, 'Something went wrong. Please try again.', 'server-error'),
      );
    });
  });
  const close = () => {
    closed ??= new Promise<void>((done) => {
      server.close(() => done());
    })
      .then(() => Promise.all([db.close(), telemetry.flush()]))
      .then(() => undefined);
    return closed;
  };
  return { server, close, ready: db.ready };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.GAME_PORT ?? 4173);
  const host = process.env.GAME_HOST ?? '127.0.0.1';
  const hosted = hostedConfig(process.env);
  if (hosted.production && !hosted.dbUrl)
    throw new Error('Production requires GAME_STORAGE=supabase and a database URL.');
  const { server, close, ready } = createGameServer({
    database: hosted.dbUrl
      ? createPostgresDatabase(hosted.dbUrl, hosted.staff, process.env.SUPABASE_DATABASE_CA_FILE)
      : undefined,
    production: hosted.production,
    studioAccounts: hosted.production || process.env.GAME_STUDIO_ACCOUNTS === '1',
    telemetry: studioTelemetry(hosted.telemetry),
    dbPath: process.env.GAME_DB,
    demoRunsEnabled:
      !hosted.production &&
      ['127.0.0.1', 'localhost', '::1'].includes(host) &&
      (process.env.GAME_DEMO_RUNS === '1' ||
        (process.env.GAME_DEMO_RUNS === undefined && Boolean(process.env.GAME_DEV_DIST))),
    staticDir: process.env.GAME_DEV_DIST,
    canvasOrigins: (process.env.GAME_CANVAS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    aiEnabled: process.env.GAME_AI_ENABLED === '1',
    aiKey: process.env.OPENAI_API_KEY,
    aiBudgetCents:
      process.env.GAME_AI_BUDGET_CENTS === undefined ? undefined : Number(process.env.GAME_AI_BUDGET_CENTS),
  });
  try {
    await ready;
  } catch {
    await close();
    throw new Error(
      'The course database could not initialize. Check the database connection and permissions.',
    );
  }
  server.listen(port, host, () => {
    const address = server.address();
    console.log(
      'AI in Education is ready at http://' +
        host +
        ':' +
        (typeof address === 'object' && address ? address.port : port),
    );
  });
  const shutdown = () => {
    void close().then(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
