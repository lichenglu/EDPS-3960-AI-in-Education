import { useEffect, useRef, useState } from 'react';
import { MapPinIcon } from 'naive-icons';
import type { Inspection } from '@/contracts/week-one';
import type { Step } from '@/curriculum/types';
import { canAdvance } from '@/game/quest-state';
import { ActivityTour, firstCaseCue, guideAnchors } from './ActivityGuide';
import { SceneDialogue } from './SceneDialogue';
import { RecordSlips } from './WeekOneActivity';
import { recordOutcome, sceneTurns, stations, stationStills } from './room-content';

export function OpeningWalkthrough({
  step,
  textView,
  onExit,
}: {
  step: Step;
  textView: boolean;
  onExit: () => void;
}) {
  const [arriving, setArriving] = useState(true);
  const [lastIntroLine, setLastIntroLine] = useState(false);
  const [inspected, setInspected] = useState<Inspection[]>([]);
  const [selected, setSelected] = useState<number>();
  const [showGuide, setShowGuide] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const inspectButton = useRef<HTMLButtonElement>(null);
  const review = useRef<HTMLHeadingElement>(null);
  const practice = inspected.includes('practice');
  const fresh = inspected.includes('fresh');
  const readyToContinue = canAdvance(step, { inspected, selected });
  const cue = firstCaseCue({ arriving, lastIntroLine, practice, fresh, readyToContinue });
  const choices = step.type === 'choice' ? step.options : [];
  const feedback = selected === undefined ? undefined : choices[selected]?.feedback;

  useEffect(() => {
    if (arriving) root.current?.querySelector<HTMLButtonElement>(guideAnchors.intro)?.focus();
    else if (fresh) review.current?.focus();
    else inspectButton.current?.focus();
  }, [arriving, fresh]);

  function inspect() {
    setInspected(practice ? ['practice', 'fresh'] : ['practice']);
  }

  return (
    <div className="quest-preview" role="region" aria-label="Walkthrough" ref={root}>
      <div className="quest-preview-banner">
        <strong>Walkthrough</strong>
        <button type="button" className="button secondary" onClick={onExit}>
          Return to quest
        </button>
        <p>Try the controls here. Your quest progress stays where you left it.</p>
      </div>
      <div className={'play-area' + (arriving ? '' : ' paired-play-area')}>
        <section className="world-frame" aria-label={textView ? 'Room' : 'Interactive room'}>
          <div className="world-scene has-dialogue">
            {!textView && (
              <div className="world-art">
                <img className="station-still" src={stationStills[arriving ? 'entrance' : 'supply']} alt="" />
              </div>
            )}
            <div className="scene-header">
              <p className="scene-location">
                <MapPinIcon size={18} aria-hidden="true" />
                {arriving ? stations.entrance + ' · After closing' : stations.supply}
              </p>
              <h2>{arriving ? 'Welcome to the evening shift' : step.title}</h2>
            </div>
            <SceneDialogue
              turns={sceneTurns(step)}
              onLastIntroLine={setLastIntroLine}
              introduction={arriving ? () => setArriving(false) : undefined}
              inspection={
                !arriving && !fresh
                  ? {
                      label: practice ? 'Inspect fresh attempt' : 'Inspect practice record',
                      onPress: inspect,
                      buttonRef: inspectButton,
                      disabled: false,
                    }
                  : undefined
              }
              outcome={recordOutcome(practice, fresh)}
            />
          </div>
        </section>
        {!arriving && (
          <section className="quest-paper" aria-label="Station activities">
            <h2>Check the workshop notices</h2>
            <div className="station-actions">
              {fresh && (
                <h3 ref={review} tabIndex={-1}>
                  Review the two records
                </h3>
              )}
              <RecordSlips practice={practice} fresh={fresh} />
              {fresh && (
                <>
                  <p className="prompt">{step.prompt}</p>
                  <div className="choices" role="group" aria-label="Choices">
                    {choices.map((option, index) => (
                      <button
                        type="button"
                        className="choice"
                        key={option.label}
                        aria-pressed={selected === index}
                        onClick={() => setSelected(index)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {feedback && (
                    <div className="feedback" role="status">
                      <p>{feedback}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="step-actions">
              <button
                type="button"
                className="button"
                data-guide-anchor="continue"
                disabled={!readyToContinue}
                onClick={onExit}
              >
                Continue
              </button>
            </div>
          </section>
        )}
      </div>
      {showGuide && <ActivityTour root={root} cue={cue} onDismiss={() => setShowGuide(false)} />}
    </div>
  );
}
