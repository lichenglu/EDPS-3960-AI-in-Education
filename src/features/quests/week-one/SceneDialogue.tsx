import { ChevronLeftIcon, ChevronRightIcon } from 'naive-icons';
import { useEffect, useState, type Ref } from 'react';
import type { Speaker } from '@/curriculum/types';
import { CitedText } from './sources/CitedText';
import { SpeakerTag } from './QuestTools';

type Turn = { speaker: Speaker; text: string };

export function SceneDialogue({
  turns,
  introduction,
  onLastIntroLine,
  inspection,
  next,
  outcome,
  initialLine = 0,
  onLineChange,
}: {
  turns: Turn[];
  introduction?: () => void;
  onLastIntroLine?: (last: boolean) => void;
  inspection?: { label: string; onPress: () => void; disabled: boolean; buttonRef: Ref<HTMLButtonElement> };
  next?: () => void;
  outcome?: string;
  initialLine?: number;
  onLineChange?: (line: number) => void;
}) {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialLine), turns.length - 1));
  const { speaker, text } = turns[index];
  const last = index === turns.length - 1;
  const isIntroduction = Boolean(introduction);
  const startsInvestigation = last && isIntroduction;

  useEffect(() => {
    if (isIntroduction) onLastIntroLine?.(last);
  }, [isIntroduction, last, onLastIntroLine]);

  function move(line: number) {
    setIndex(line);
    onLineChange?.(line);
  }

  return (
    <section className="scene-dialogue" aria-label="Scene dialogue">
      <div className="scene-speech" aria-live="polite">
        <SpeakerTag name={speaker} />
        <p>
          <CitedText text={text} />
        </p>
      </div>
      {outcome && (
        <p className="scene-outcome" role="status">
          {outcome}
        </p>
      )}
      <div className="dialogue-turns">
        <div className="line-controls">
          <button
            className="dialogue-arrow"
            type="button"
            aria-label="Previous line"
            disabled={index === 0}
            onClick={() => move(index - 1)}
          >
            <ChevronLeftIcon size={22} aria-hidden="true" />
          </button>
          <span aria-hidden="true">
            {index + 1} / {turns.length}
          </span>
          <span className="visually-hidden">
            Line {index + 1} of {turns.length}
          </span>
          <button
            type="button"
            className={startsInvestigation ? 'scene-inspect' : 'dialogue-arrow'}
            aria-label={startsInvestigation ? undefined : 'Next line'}
            data-guide-anchor={isIntroduction ? 'intro' : undefined}
            disabled={last && !isIntroduction}
            onClick={() => {
              if (last) introduction?.();
              else move(index + 1);
            }}
          >
            {startsInvestigation ? (
              'Start the investigation'
            ) : (
              <ChevronRightIcon size={22} aria-hidden="true" />
            )}
          </button>
        </div>
        {inspection && (
          <button
            className="button scene-inspect"
            type="button"
            ref={inspection.buttonRef}
            data-guide-anchor="inspect"
            disabled={inspection.disabled}
            onClick={inspection.onPress}
          >
            <span aria-hidden="true">◇</span> {inspection.label}
          </button>
        )}
        {next && (
          <button type="button" className="go-to-activity" onClick={next}>
            Go to activity
          </button>
        )}
      </div>
    </section>
  );
}
