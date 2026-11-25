import { useEffect, useRef } from 'react';
import type { Access } from '@/contracts/session';
import type { WeekOneCheckpoint, WeekOneIntent } from '@/contracts/week-one';
import type { Quest } from '@/curriculum/types';
import type { Station } from './room-content';
import { WeekOneScene } from './WeekOneScene';

export function StationReview({
  quest,
  access,
  station,
  stepIndex,
  visitedSteps,
  record,
  textView,
  onExit,
  onGoToSupply,
  onSelectStep,
  onContinue,
  initialLine,
  onLineChange,
  locked,
  send,
}: {
  quest: Quest;
  access: Access;
  station: Station;
  stepIndex: number;
  visitedSteps: number[];
  record: WeekOneCheckpoint;
  textView: boolean;
  onExit: () => void;
  onGoToSupply: () => void;
  onSelectStep: (index: number) => void;
  onContinue: () => void;
  initialLine: number;
  onLineChange: (line: number) => void;
  locked: boolean;
  send: (intent: WeekOneIntent) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const arriving = station === 'entrance';
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className="quest-preview station-review" aria-label="Reviewing a stop">
      <div className="quest-preview-banner">
        <strong>Reviewing a stop</strong>
        <div className="review-navigation">
          {arriving && (
            <button type="button" className="button secondary" onClick={onGoToSupply}>
              Go to supply table
            </button>
          )}
          <button type="button" className="button secondary" onClick={onExit}>
            Return to quest
          </button>
        </div>
        {visitedSteps.length > 1 && (
          <label className="review-scene-picker">
            Scene
            <select
              value={quest.steps[stepIndex].id}
              onChange={(event) => {
                onSelectStep(
                  visitedSteps.find((index) => quest.steps[index].id === event.target.value) ?? stepIndex,
                );
              }}
            >
              {visitedSteps.map((index) => (
                <option key={index} value={quest.steps[index].id}>
                  {quest.steps[index].title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <WeekOneScene
        quest={quest}
        access={access}
        station={station}
        stepIndex={stepIndex}
        record={record}
        textView={textView}
        headingRef={heading}
        initialLine={initialLine}
        onLineChange={onLineChange}
        disabled={locked}
        send={send}
        review
        onInspectStart={arriving ? onGoToSupply : undefined}
        onAdvance={onContinue}
      />
    </section>
  );
}
