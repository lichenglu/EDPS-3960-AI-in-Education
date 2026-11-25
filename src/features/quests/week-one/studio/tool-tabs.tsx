import { studioPhases, type StudioPhase as Stage } from '@/contracts/studio';
import { roles } from './tools';

export const stages: Stage[] = [...studioPhases];
export const stageLabels = { run: 'Run', tune: 'Tune / Harness', audit: 'Settings & Audit' } as const;

export function ToolTabs({
  stage,
  select,
  available,
}: {
  stage: Stage;
  select: (stage: Stage) => void;
  available: (stage: Stage, index: number) => boolean;
}) {
  const choices = stages.filter(available);
  return (
    <div className="tabs" role="tablist" aria-label="Tool tabs">
      {stages.map((phase) => {
        const enabled = choices.includes(phase);
        return (
          <button
            key={phase}
            id={'tab-' + phase}
            type="button"
            role="tab"
            aria-controls="work-surface"
            aria-selected={stage === phase}
            tabIndex={stage === phase ? 0 : -1}
            disabled={!enabled}
            className={phase}
            onClick={() => select(phase)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const offset = event.key === 'ArrowLeft' ? choices.length - 1 : 1;
              const target =
                event.key === 'Home'
                  ? choices[0]
                  : event.key === 'End'
                    ? choices.at(-1)
                    : choices[(choices.indexOf(phase) + offset) % choices.length];
              if (target) {
                select(target);
                document.getElementById('tab-' + target)?.focus();
              }
            }}
          >
            {stageLabels[phase]} <small>{enabled ? roles[phase] : 'Locked'}</small>
          </button>
        );
      })}
    </div>
  );
}
