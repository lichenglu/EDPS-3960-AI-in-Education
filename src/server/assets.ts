import { extname, resolve, sep } from 'node:path';
import { printQuestId } from '../curriculum/print-route.ts';
import { archivedWeekOnePath, isWeekOneStudioPath, weekOneStudioPage } from '../curriculum/studio-route.ts';
import type { QuestCatalog } from './types.ts';
export const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.vtt': 'text/vtt; charset=utf-8',
};
export function frameOrigin(value: string): string {
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (value === url.origin && (url.protocol === 'https:' || (local && url.protocol === 'http:')))
      return value;
  } catch {
    // Report malformed URLs and disallowed origins in the same format.
  }
  throw new Error('Canvas frame origin must be an exact HTTPS origin or a local HTTP origin');
}
export function publicRoute(
  questCatalog: QuestCatalog,
  path: string,
  staticDir: string,
): [string | null, number] {
  const assetsIndex = resolve(staticDir, 'index.html');
  if (isWeekOneStudioPath(path)) return [resolve(staticDir, weekOneStudioPage), 200];
  const questPage = /^\/quests\/(w\d{2})\/?$/.exec(path);
  const printable = printQuestId(path);
  const appPage =
    path === '/' ||
    path === '/instructor' ||
    path === '/instructor/' ||
    path === archivedWeekOnePath ||
    path === archivedWeekOnePath + '/' ||
    (questPage && Object.hasOwn(questCatalog, questPage[1])) ||
    (printable && Object.hasOwn(questCatalog, printable));
  if (appPage) return [assetsIndex, 200];
  if (path.startsWith('/quests/')) return [assetsIndex, 404];
  if (path === '/' + weekOneStudioPage) return [null, 404];

  const file = resolve(staticDir, '.' + path);
  if (file.startsWith(staticDir + sep) && contentTypes[extname(file)]) return [file, 200];
  return [null, 404];
}
