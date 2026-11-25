import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const run = await mkdtemp(join(tmpdir(), 'next-move-browser-'));
const profile = join(run, 'firefox-profile');
const cache = join(run, 'firefox-cache');
await Promise.all([mkdir(profile), mkdir(cache)]);
const output = join(run, 'results');
try {
  const child = Bun.spawn(
    [
      process.execPath,
      resolve('node_modules/@playwright/test/cli.js'),
      'test',
      '--output',
      output,
      ...process.argv.slice(2),
    ],
    {
      env: { ...process.env, MOZ_APP_DATA: profile, MOZ_LOCAL_APP_DATA: cache },
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    },
  );
  process.exitCode = await child.exited;
  console.log('Browser results and screenshots:', output);
} finally {
  await Promise.all([
    rm(profile, { recursive: true, force: true }),
    rm(cache, { recursive: true, force: true }),
  ]);
}
