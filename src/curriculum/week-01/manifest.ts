// Change the order here. The IDs are also used in saved progress and by the 3D models.
export const weekOneManifest = {
  id: 'w01',
  version: 'studio-1',
  missions: ['transcript', 'reading', 'tickets', 'hints', 'toolkit'],
  opening: [
    'open-house',
    'sound-desk',
    'reading-corner',
    'exit-tickets',
    'hint-assistant',
    'semester-toolkit',
    'three-perspectives',
  ],
} as const;

export type StudioMission = (typeof weekOneManifest.missions)[number];

export function previousStudioMission(id: StudioMission): StudioMission | undefined {
  const index = weekOneManifest.missions.indexOf(id);
  return index > 0 ? weekOneManifest.missions[index - 1] : undefined;
}
