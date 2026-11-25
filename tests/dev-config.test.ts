import { expect, test } from 'bun:test';
import { resolve, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveConfig } from 'vite';

test('Vite keeps its optimized dependency cache outside the synced workspace and installed packages', async () => {
  const config = await resolveConfig({ configFile: resolve('vite.config.ts') }, 'serve');
  const cachePath = relative(tmpdir(), config.cacheDir);
  expect(cachePath.split(sep)[0]).toBe('the-next-move-vite');
  expect(relative(resolve('.'), config.cacheDir).startsWith('..' + sep)).toBe(true);
});
