import { lazy, Suspense, useRef, type ComponentProps, type Ref } from 'react';
import { Button } from 'animal-island-ui';
import { MapPinIcon } from 'naive-icons';
import type { Access } from '@/contracts/session';
import type { WeekOneCheckpoint, WeekOneIntent } from '@/contracts/week-one';
import type { Quest } from '@/curriculum/types';
import { canAdvance } from '@/game/quest-state';
import { ActivityGuide } from './ActivityGuide';
import { SceneDialogue } from './SceneDialogue';
import { WeekOneActivity } from './WeekOneActivity';
import { recordOutcome, sceneTurns, stations, type Station } from './room-content';
import { CitedText } from './sources/CitedText';

const WorkshopRoom = lazy(() => import('../room/WorkshopRoom'));

export function WeekOneScene({
  quest,
  record,
  access,
  station,
  stepIndex = record.state.index,
  textView,
  disabled,
  review = false,
  draftKey,
  headingRef,
  recordsRef,
  inspection,
  onInspectStart,
  initialLine,
  onLineChange,
  onLastIntroLine,
  onShowGuide,
  onAdvance,
  onOpenNotebook,
  send = () => undefined,
}: {
  quest: Quest;
  record: WeekOneCheckpoint;
  access: Access;
  station: Station;
  stepIndex?: number;
  textView: boolean;
  disabled: boolean;
  review?: boolean;
  draftKey?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  recordsRef?: Ref<HTMLHeadingElement>;
  inspection?: ComponentProps<typeof SceneDialogue>['inspection'];
  onInspectStart?: () => void;
  initialLine?: number;
  onLineChange?: (line: number) => void;
  onLastIntroLine?: (last: boolean) => void;
  onShowGuide?: () => void;
  onAdvance?: () => void;
  onOpenNotebook?: () => void;
  send?: (intent: WeekOneIntent) => void;
}) {
  const activityHeading = useRef<HTMLHeadingElement>(null);
  const step = quest.steps[stepIndex];
  const entry = step ? (record.state.entries[step.id] ?? {}) : {};
  const arriving = station === 'entrance';
  const opening = step?.id === 'opening';
  const practice = record.state.entries.opening?.inspected?.includes('practice') ?? false;
  const fresh = opening && (entry.inspected?.includes('fresh') ?? false);
  const turns = step ? sceneTurns(step) : [];
  const canContinue = step && !disabled && (review || canAdvance(step, entry));

  return (
    <div className={'play-area' + (!textView && !arriving ? ' paired-play-area' : '')}>
      {(!textView || step) && (
        <section className="world-frame" aria-label={textView ? 'Scene' : 'Interactive room'}>
          <div className={'world-scene' + (step ? ' has-dialogue' : '')}>
            {!textView && (
              <div className="world-art">
                <Suspense
                  fallback={<div className="world-still" aria-label="Opening the workshop" role="img" />}
                >
                  <WorkshopRoom
                    station={station}
                    opened={!arriving && practice}
                    replayed={
                      (!review || stepIndex >= quest.steps.findIndex((item) => item.id === 'change-rule')) &&
                      Boolean(record.state.entries['change-rule']?.replay)
                    }
                    filed={!step}
                    onInspect={inspection?.onPress}
                    disabled={disabled}
                  />
                </Suspense>
              </div>
            )}
            <div className="scene-header">
              <p className="scene-location">
                <MapPinIcon size={18} aria-hidden="true" />
                {arriving ? stations.entrance + ' · After closing' : stations[station]}
              </p>
              {step && (
                <>
                  <h2 ref={headingRef} tabIndex={-1}>
                    {arriving ? 'Welcome to the evening shift' : step.title}
                  </h2>
                  {!arriving && (
                    <div className="scene-progress">
                      <span>
                        {step.stage} · {step.minutes} min
                      </span>
                      <span>
                        {stepIndex + 1} / {quest.steps.length}
                      </span>
                      <progress
                        className="visually-hidden"
                        aria-label="Completed quest steps"
                        value={stepIndex}
                        max={quest.steps.length}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            {turns.length > 0 && (
              <SceneDialogue
                key={arriving ? 'entrance' : step?.id}
                turns={turns}
                introduction={onInspectStart}
                initialLine={initialLine}
                onLineChange={onLineChange}
                onLastIntroLine={onLastIntroLine}
                inspection={inspection}
                outcome={opening && !arriving ? recordOutcome(practice, fresh) : undefined}
                next={!arriving && !inspection ? () => activityHeading.current?.focus() : undefined}
              />
            )}
          </div>
        </section>
      )}
      {!arriving && (
        <section key={step?.id ?? 'complete'} className="quest-paper" aria-label="Station activities">
          {step ? (
            <div>
              <h2 tabIndex={-1} ref={activityHeading}>
                {opening ? 'Check the workshop notices' : 'Your activity'}
              </h2>
              {!opening && <ActivityGuide step={step} onShowGuide={onShowGuide} />}
              <div className="station-actions">
                {fresh && (
                  <h3 ref={recordsRef} tabIndex={-1}>
                    Review the two records
                  </h3>
                )}
                {step.prompt && !opening && (
                  <p className="prompt">
                    <CitedText text={step.prompt} />
                  </p>
                )}
                <WeekOneActivity
                  step={step}
                  record={record}
                  entry={entry}
                  access={access}
                  disabled={disabled}
                  review={review}
                  draftKey={draftKey}
                  send={send}
                />
              </div>
              <div className="step-actions">
                <Button
                  type="primary"
                  className="button"
                  data-guide-anchor="continue"
                  disabled={!canContinue || !onAdvance}
                  onClick={onAdvance}
                >
                  {stepIndex === quest.steps.length - 1 ? 'Finish quest' : 'Continue'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="step-count">I Do · We Do · You Do</p>
              <h2 tabIndex={-1} ref={headingRef}>
                Week 1 evidence filed
              </h2>
              <p>
                The center’s window is lit. Take your field note to the ungraded orientation check in Canvas.
              </p>
              <div className="record-slip">
                <strong>Your field note</strong>
                <p>{record.state.entries.orientation?.text}</p>
              </div>
              <button type="button" className="button" onClick={onOpenNotebook}>
                Read my notebook
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
