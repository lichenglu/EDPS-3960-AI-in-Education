import { courseCast, type CharacterId } from '../characters.ts';
import { missions } from './cases.ts';
import { weekOneManifest, type StudioMission } from './manifest.ts';

export const guideIds = {
  transcript: 'chenglu',
  reading: 'yinqi',
  tickets: 'eunseo',
  hints: 'guimin',
  toolkit: 'xinlin',
} as const satisfies Record<StudioMission, CharacterId>;

export const deskGreetings: Record<StudioMission, string> = {
  transcript: 'Start at the Sound desk. Let’s make a transcript that our class can actually use.',
  reading:
    'Help me find a good book or club for each reader. Every preference and book description you need is here.',
  tickets: 'I’ve collected some exit tickets. Help me see who’s ready and who might need a check-in.',
  hints: 'I’m setting up a riddle helper. Let’s see how it handles a real conversation.',
  toolkit:
    'Put together a toolkit you would trust for your classroom. I’ll show you where to look for the fine print.',
};

const firstMission = weekOneManifest.missions[0];

export const guest = {
  ...courseCast.gokhan,
  greeting: `Welcome! If you’re new here, ${courseCast[guideIds[firstMission]].name} is waiting at the ${missions[firstMission].label}.`,
};

export type CastId = StudioMission | 'gokhan';

export function getGuide(id: CastId) {
  return id === 'gokhan' ? guest : { ...courseCast[guideIds[id]], greeting: deskGreetings[id] };
}
