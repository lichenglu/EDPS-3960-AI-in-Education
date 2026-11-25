import { resolve } from 'node:path';

const node = Bun.which('node');
if (!node) throw new Error('Vite requires Node.js. Install a supported version and run bun run dev again.');

const host = process.env.GAME_HOST ?? '127.0.0.1';
const port = process.env.GAME_PORT ?? '4173';
const loopback = ['127.0.0.1', 'localhost', '::1'].includes(host);
const apiSocket = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } });
const apiPort = String(apiSocket.port);
apiSocket.stop();

const options = { stdout: 'inherit', stderr: 'inherit' } as const;
const api = Bun.spawn([process.execPath, '--watch', '--no-clear-screen', 'src/server/index.ts'], {
  ...options,
  env: {
    ...process.env,
    GAME_RUNTIME: 'development',
    GAME_HOST: '127.0.0.1',
    GAME_PORT: apiPort,
    GAME_DEMO_RUNS: loopback ? (process.env.GAME_DEMO_RUNS ?? '1') : '0',
  },
});
const web = Bun.spawn([node, resolve('node_modules/vite/bin/vite.js'), '--host', host, '--port', port], {
  ...options,
  env: { ...process.env, COURSE_API_PORT: apiPort },
});

function stop() {
  api.kill('SIGTERM');
  web.kill('SIGTERM');
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  process.exitCode = await Promise.race([api.exited, web.exited]);
} finally {
  stop();
  await Promise.all([api.exited, web.exited]);
}
