import { weekOneVersion } from '@/contracts/week-one';
import { stations, type Station } from './room-content';

export type ReviewPosition = { kind: 'station'; station: Station; stepIndex: number };

export function weekOneViewPosition(accountKey: string) {
  const prefix = 'next-move.w01.' + weekOneVersion + '.view.' + accountKey + '.';
  const memory = new Map<string, string>();

  function read(field: string, sameTab = false) {
    if (memory.has(field)) return memory.get(field);
    if (!sameTab) {
      try {
        const value = localStorage.getItem(prefix + field);
        if (value !== null) return value;
      } catch {
        /* A restricted embed can still use this tab's storage. */
      }
    }
    try {
      return sessionStorage.getItem(prefix + field) ?? undefined;
    } catch {
      return undefined;
    }
  }

  function write(field: string, value: string, sameTab = false) {
    memory.set(field, value);
    if (!sameTab) {
      try {
        localStorage.setItem(prefix + field, value);
      } catch {
        /* See tab-local fallback below. */
      }
    }
    try {
      sessionStorage.setItem(prefix + field, value);
    } catch {
      /* The running quest keeps the position in memory. */
    }
  }

  function readIndex(field: string) {
    const value = read(field);
    if (value === undefined || !/^\d+$/.test(value)) return undefined;
    const index = Number(value);
    return Number.isSafeInteger(index) ? index : undefined;
  }

  return {
    started: () => read('started') === 'yes',
    start: () => write('started', 'yes'),
    line: (scene: string) => readIndex('line.' + scene) ?? 0,
    setLine: (scene: string, line: number) => write('line.' + scene, String(line)),
    stationStep: (station: Station) => readIndex('station.' + station),
    setStationStep: (station: Station, stepIndex: number) => write('station.' + station, String(stepIndex)),
    review(): ReviewPosition | null {
      const saved = read('review', true);
      if (!saved) return null;
      try {
        const position = JSON.parse(saved) as Partial<ReviewPosition> | null;
        if (
          position?.kind === 'station' &&
          typeof position.station === 'string' &&
          Object.hasOwn(stations, position.station) &&
          typeof position.stepIndex === 'number' &&
          Number.isSafeInteger(position.stepIndex) &&
          position.stepIndex >= 0
        ) {
          return { kind: 'station', station: position.station, stepIndex: position.stepIndex };
        }
      } catch {
        /* Ignore an invalid saved location. */
      }
      return null;
    },
    setReview: (position: ReviewPosition | null) =>
      write('review', position ? JSON.stringify(position) : '', true),
  };
}
