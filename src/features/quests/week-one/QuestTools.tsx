import { ChevronRightIcon } from 'naive-icons';
import { CitedText } from './sources/CitedText';
import type { Quest, Speaker, Step } from '@/curriculum/types';
import type { WeekOneCheckpoint } from '@/contracts/week-one';
import { practiceEvidence, tutorRules } from '@/curriculum/week-one';
import { introductions, roleLabels, sceneTurns, stationFor, stations, type Station } from './room-content';

export type Tool = 'Map' | 'Notebook' | 'Transcript';

export function SpeakerTag({ name }: { name: Speaker }) {
  return (
    <span className="speaker-tag" data-speaker={name}>
      {name} · {roleLabels[name]}
    </span>
  );
}
export function QuestTools({
  tool,
  quest,
  record,
  station,
  savedStation,
  previewing,
  onVisit,
}: {
  tool: Tool;
  quest: Quest;
  record: WeekOneCheckpoint;
  station: Station;
  savedStation: Station;
  previewing: boolean;
  onVisit: (station: Station) => void;
}) {
  const reached = quest.steps.slice(0, record.state.index + 1);
  if (tool === 'Map') {
    const visited = new Set<Station>([
      'entrance',
      savedStation,
      ...reached.slice(0, record.state.index).map(stationFor),
    ]);
    return (
      <>
        <ol className="station-map">
          {(Object.keys(stations) as Station[]).map((location) => {
            const current = location === station;
            const saved = location === savedStation;
            return (
              <li key={location} aria-current={current ? 'location' : undefined}>
                {visited.has(location) && (!current || (saved && previewing)) ? (
                  <button type="button" onClick={() => onVisit(location)}>
                    <span>
                      {stations[location]}
                      {saved && <strong> · Saved place</strong>}
                    </span>
                    <ChevronRightIcon size={19} aria-hidden="true" />
                  </button>
                ) : (
                  <span className="station-map-label">
                    {stations[location]}
                    {current ? <strong> · You are here</strong> : <small> · Not yet visited</small>}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p>{quest.minutes} active minutes planned · I Do 30 · We Do 50 · You Do 25</p>
        <p>
          <a href="/">Course quest map</a>
        </p>
      </>
    );
  }
  if (tool === 'Transcript')
    return (
      <>
        {(Object.keys(introductions) as Speaker[]).map((name) => (
          <p key={name}>
            <SpeakerTag name={name} /> {introductions[name]}
          </p>
        ))}
        {reached.map((scene) => (
          <section key={scene.id}>
            <h3>{scene.title}</h3>
            {sceneTurns(scene).map(({ speaker, text }, i) => (
              <p key={i}>
                <strong>{speaker}</strong> <CitedText text={text} />
              </p>
            ))}
          </section>
        ))}
      </>
    );
  return (
    <>
      {!record.revision && <p>Inspect a tray to add your first record here.</p>}
      {reached.map((scene) => {
        const entry = record.state.entries[scene.id];
        if (!entry) return null;
        return (
          <section key={scene.id}>
            <h3>{scene.title}</h3>
            <SavedSceneNotes scene={scene} record={record} includeInspections />
          </section>
        );
      })}
    </>
  );
}

export function SavedSceneNotes({
  scene,
  record,
  includeInspections,
}: {
  scene: Step;
  record: WeekOneCheckpoint;
  includeInspections?: boolean;
}) {
  const entry = record.state.entries[scene.id];
  if (!entry) return null;
  return (
    <>
      {includeInspections &&
        entry.inspected?.map((source) => (
          <p key={source}>
            {practiceEvidence
              .filter((line) => (line.id === 'visitor') === (source === 'fresh'))
              .map((line) => line.line)
              .join(' ')}
          </p>
        ))}
      {entry.evidence && (
        <p>Attached · {practiceEvidence.find((line) => line.id === entry.evidence)?.label}</p>
      )}
      {entry.selected !== undefined && <p>{scene.options?.[entry.selected]?.label}</p>}
      {entry.revealed && <p>{scene.feedback}</p>}
      {entry.rule && <p>Rule · {tutorRules[entry.rule]}</p>}
      {entry.prediction && <p>Prediction · {entry.prediction}</p>}
      {entry.first && (
        <p>
          <strong>Filed first attempt</strong> · {entry.first}
        </p>
      )}
      {entry.revision && (
        <p>
          <strong>Assisted revision</strong> · {entry.revision}
        </p>
      )}
      {(entry.text || entry.reflection) && <p>{entry.text || entry.reflection}</p>}
      {entry.replay && (
        <p>
          {scene.id === 'response-lab'
            ? record.unlocked?.replay
            : scene.options?.[entry.rule === 'attempt-first' ? 1 : 0]?.feedback}
        </p>
      )}
    </>
  );
}
