import { weekOneManifest } from './week-01/manifest.ts';

export const weekOneStudioPath = '/quests/' + weekOneManifest.id;
export const weekOneStudioPage = 'classroom-studio.html';
export const archivedWeekOnePath = '/archive/week-one';

export function isWeekOneStudioPath(path: string) {
  const normalized = path.replace(/\/$/, '');
  return normalized === weekOneStudioPath || normalized === weekOneStudioPath + '/studio';
}
