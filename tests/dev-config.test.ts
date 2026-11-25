import { expect, test } from 'bun:test';
import { resolve, relative, sep } from 'node:path';
import { resolveConfig } from 'vite';

test('Vite keeps its optimized dependency cache separate from installed packages', async () => {
  const config = await resolveConfig({ configFile: resolve('vite.config.ts') }, 'serve');
  const cachePath = relative(resolve('.'), config.cacheDir);
  expect(cachePath.split(sep)[0]).toBe('.vite');
});
