import { expect, test } from 'bun:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('rebuilding removes retired files inside a public asset directory', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'next-move-rebuild-'));
  try {
    const retired = join(outDir, 'activities/portraits/retired.webp');
    await Bun.write(retired, 'stale distribution asset');

    const script =
      'import { buildGame } from "./scripts/build.ts"; await buildGame(' + JSON.stringify(outDir) + ');';
    const build = Bun.spawnSync([process.execPath, '--eval', script]);
    expect(build.exitCode, build.stderr.toString()).toBe(0);

    expect(await Bun.file(retired).exists()).toBe(false);
    expect(await readdir(join(outDir, 'activities'))).not.toContain('portraits');
    expect(await Bun.file(join(outDir, 'studio/models/classroom.glb')).exists()).toBe(true);

    const faviconPaths = await Promise.all(
      ['index.html', 'classroom-studio.html'].map(async (page) => {
        const html = await Bun.file(join(outDir, page)).text();
        const favicon = html.match(/<link rel="icon" href="([^"]+)"/)?.[1];
        expect(favicon).toMatch(/^\/course-favicon-[\w-]+\.png$/);
        expect(await Bun.file(join(outDir, favicon ?? '')).exists()).toBe(true);
        return favicon;
      }),
    );
    expect(faviconPaths[0]).toBe(faviconPaths[1]);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
