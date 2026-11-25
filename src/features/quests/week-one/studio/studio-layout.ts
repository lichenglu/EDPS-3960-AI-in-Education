import { studioMissionIds } from '@/contracts/studio';
import { getGuide } from '@/curriculum/week-01/guides';
import layout from './world-layout.json';
import cast from './cast-layout.json';

export { getGuide, guest, type CastId } from '@/curriculum/week-01/guides';

// Mission order comes from the lesson manifest. Positions still match the authored model IDs.
export const desks = studioMissionIds.map((id) => {
  const position = layout.find((desk) => desk.id === id);
  if (!position) throw new Error('Missing classroom position for ' + id);
  return { ...position, ...getGuide(id), id };
});
export const castPositions = cast.characters;
export const welcomeBench = cast.welcomeBench;
