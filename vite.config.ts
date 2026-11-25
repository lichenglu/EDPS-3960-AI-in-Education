import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { isWeekOneStudioPath, weekOneStudioPage } from './src/curriculum/studio-route.ts';
import { frameOrigin } from './src/server/assets.ts';

const project = fileURLToPath(new URL('.', import.meta.url));
const cacheRoot = resolve(
  tmpdir(),
  'the-next-move-vite',
  createHash('sha256').update(project).digest('hex').slice(0, 12),
);
const handout = '/activities/w01.html';
const handoutEntry =
  '/@fs' + normalizePath(resolve(project, 'src/features/quests/week-one/sources/handout.ts'));
const origins = (process.env.GAME_CANVAS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(frameOrigin);

const framePolicy = ["frame-ancestors 'self'", ...origins].join(' ');

export default defineConfig({
  root: resolve(project, 'src/app'),
  // Keep generated dependencies outside installed packages and cloud sync.
  cacheDir: resolve(cacheRoot, 'preview-' + (process.env.GAME_PORT ?? '4173')),
  publicDir: resolve(project, 'public'),
  plugins: [
    react(),
    {
      name: 'course-public-assets',
      transformIndexHtml: {
        order: 'pre',
        handler(html, { path }) {
          if (path === '/' + weekOneStudioPage) {
            return html
              .replace('./classroom-studio.tsx', '/classroom-studio.tsx')
              .replace('./assets/course-favicon.png', '/assets/course-favicon.png');
          }
          if (path === handout) {
            return html.replace(
              '<script src="./w01-sources.js" defer></script>',
              '<script type="module" src="' + handoutEntry + '"></script>',
            );
          }
          return html;
        },
      },
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if ((request.method === 'GET' || request.method === 'HEAD') && request.url) {
            const url = new URL(request.url, 'http://localhost');
            if (isWeekOneStudioPath(url.pathname)) request.url = '/' + weekOneStudioPage + url.search;
          }
          next();
        });
        server.middlewares.use(async (request, response, next) => {
          if (request.method !== 'GET' || request.url?.split('?')[0] !== handout) return next();
          try {
            const source = await readFile(resolve(project, 'public/activities/w01.html'), 'utf8');
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.setHeader('Content-Security-Policy', framePolicy);
            response.end(await server.transformIndexHtml(handout, source));
          } catch (error) {
            next(error);
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(project, 'src'),
      '/assets/island': resolve(project, 'node_modules/animal-island-ui/dist'),
      '/assets/fonts/nunito.woff2': resolve(
        project,
        'node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2',
      ),
    },
  },
  server: {
    strictPort: true,
    fs: { allow: [resolve(project, 'src'), resolve(project, 'node_modules'), cacheRoot] },
    headers: { 'Content-Security-Policy': framePolicy },
    proxy: { '/api': 'http://127.0.0.1:' + (process.env.COURSE_API_PORT ?? '4174') },
  },
});
