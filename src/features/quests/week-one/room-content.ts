import type { Speaker, Step } from '@/curriculum/types';
import { openingDialogue } from '@/curriculum/week-one';
import entranceStill from '../../../assets/workshop-evening.webp';
import supplyStill from '../../../assets/workshop-supply.webp';
import benchStill from '../../../assets/workshop-bench.webp';
import shelfStill from '../../../assets/workshop-shelf.webp';
import deskStill from '../../../assets/workshop-desk.webp';
import mapStill from '../../../assets/workshop-map.webp';

export const roleLabels: Record<Speaker, string> = {
  Chenglu: 'Center director',
  Yinqi: 'Peer tutor',
  Eunseo: 'Workshop volunteer',
  Pip: 'AI tutor',
};
export const introductions: Record<Speaker, string> = {
  Chenglu: 'I open each case and use your evidence to decide how to use Pip.',
  Eunseo: 'I prepare the workshop welcome signs. Can you help me check them?',
  Yinqi: 'I model the first example, then ask guiding questions after you try.',
  Pip: 'Chenglu is testing me at the center. I reply under the rule you choose.',
};
export const stations = {
  entrance: 'The learning center',
  supply: 'Supply table',
  bench: 'Pip’s workbench',
  shelf: 'Bottle shelf',
  desk: 'Director’s desk',
  map: 'Valley map',
};
export type Station = keyof typeof stations;

export const stationStills: Record<Station, string> = {
  entrance: entranceStill,
  supply: supplyStill,
  bench: benchStill,
  shelf: shelfStill,
  desk: deskStill,
  map: mapStill,
};

export function stationFor(step?: Step): Station {
  if (!step) return 'map';
  if (step.id === 'drift-bottle') return 'shelf';
  if (step.stage === 'You Do' || step.id === 'compare-measures') return 'desk';
  if (['predict-demo', 'demo-evidence', 'change-rule', 'ask-lantern'].includes(step.id)) return 'bench';
  return 'supply';
}

export function sceneTurns(step: Step) {
  if (step.id === 'opening') return openingDialogue;
  return (step.paragraphs ?? []).map((text, index) => {
    const speaker = (Object.keys(roleLabels) as Speaker[]).find((name) => text.startsWith(name + ':'));
    if (speaker) return { speaker, text: text.slice(speaker.length + 1).trim() };
    if (text.startsWith('Pip confirms') || (step.id === 'demo-evidence' && (index === 1 || index === 2))) {
      return { speaker: 'Pip' as const, text };
    }
    const speakerId = step.speaker;
    return {
      speaker: speakerId && Object.hasOwn(roleLabels, speakerId) ? (speakerId as Speaker) : 'Chenglu',
      text,
    };
  });
}

export function recordOutcome(practice: boolean, fresh: boolean) {
  if (fresh) return 'Fresh attempt · Eunseo wrote a sign for a different notice without help.';
  if (practice) return 'Practice record · Compare the organizer’s notice with Pip’s draft.';
}
