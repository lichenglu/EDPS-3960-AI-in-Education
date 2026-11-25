import { cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

export async function buildGame(outDir = 'dist') {
  const staging = await mkdtemp(resolve(tmpdir(), 'next-move-build-'));
  try {
    const result = await Bun.build({
      entrypoints: ['./src/app/index.html', './src/app/classroom-studio.html'],
      outdir: staging,
      publicPath: '/',
      target: 'browser',
      splitting: true,
      minify: true,
      external: ['/assets/fonts/*', '/assets/island/*', '/activities/w01-sources.css'],
    });
    if (!result.success) throw new AggregateError(result.logs, 'Browser build failed.');
    await mkdir(staging + '/assets', { recursive: true });
    await mkdir(staging + '/assets/fonts');
    for (const family of ['nunito', 'atkinson-hyperlegible-next']) {
      const pkg = 'node_modules/@fontsource-variable/' + family;
      await cp(
        pkg + '/files/' + family + '-latin-wght-normal.woff2',
        staging + '/assets/fonts/' + family + '.woff2',
      );
      await cp(pkg + '/LICENSE', staging + '/assets/fonts/' + family + '-license.txt');
    }
    const island = 'node_modules/animal-island-ui';
    const theme = staging + '/assets/island';
    await mkdir(theme);
    // Keep the theme's font URLs same-origin under the game's content security policy.
    await cp(island + '/dist/index.css', theme + '/index.css');
    await cp(island + '/dist/files', theme + '/files', { recursive: true });
    await cp('src/app/assets/noto-license.txt', theme + '/noto-license.txt');
    await cp(island + '/LICENSE', theme + '/license.txt');
    await cp('node_modules/naive-icons/LICENSE', theme + '/icons-license.txt');
    await cp('node_modules/@rc-component/tour/LICENSE', theme + '/tour-license.txt');
    await cp('public/activities', staging + '/activities', { recursive: true });
    await cp('public/studio', staging + '/studio', { recursive: true });
    const handout = await Bun.build({
      entrypoints: ['./src/features/quests/week-one/sources/handout.ts'],
      outdir: staging + '/activities',
      naming: 'w01-sources.js',
      target: 'browser',
      minify: true,
    });
    if (!handout.success) throw new AggregateError(handout.logs, 'Handout citation build failed.');
    const files = await readdir(staging);
    await mkdir(outDir, { recursive: true });
    // Publish assets before switching either HTML entry to the new build.
    for (const name of files.filter((name) => !name.endsWith('.html'))) {
      await cp(resolve(staging, name), resolve(outDir, name), { recursive: true, force: true });
    }
    for (const page of files.filter((name) => name.endsWith('.html'))) {
      await cp(resolve(staging, page), resolve(outDir, page));
    }
    const stagedPaths = new Set(await readdir(staging, { recursive: true }));
    for (const previous of await readdir(outDir, { recursive: true })) {
      if (!stagedPaths.has(previous)) await rm(resolve(outDir, previous), { recursive: true, force: true });
    }
    console.log('Built the course game in dist.');
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (import.meta.main) await buildGame();
