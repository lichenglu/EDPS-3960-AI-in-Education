import { useEffect, useState, type RefObject } from 'react';
import { QuestTour } from './QuestTour';
import type { Step } from '@/curriculum/types';

const controlInstructions: Partial<Record<string, string>> = {
  'previous-work':
    'After reading the three examples, write your comparison and select Save response. Read Yinqi’s feedback, then continue.',
  'three-perspectives':
    'Select Open sample record to see Yinqi’s request and Pip’s reply. Read Yinqi’s check before you continue.',
  'ask-lantern':
    'Choose a request for Pip. Check the reply each request gives you. Continue to compare the draft with the organizer’s notice.',
  'mark-evidence':
    'Select a line under Attach one line to your judgment, then choose a judgment. To revise it, pick another line or judgment. If you get stuck, ask Yinqi for a hint. Continue opens when your evidence supports your judgment.',
  'change-rule':
    'Choose a rule, write a prediction, and select Save prediction. Then select Run the same request. Compare who does the reasoning in each reply. You can change the rule, save a new prediction, and test again. Continue opens once you’ve tested the source-checking rule.',
  'drift-bottle':
    'Write your own note and select Send to class. Select Open a bottle to read a classmate’s note or an example. Save your reply and then save a private reflection. You can continue even if nobody has replied to your own bottle.',
  recommendation:
    'Read the criteria and choose a rule. Write your recommendation, then select File first attempt. Once it saves, you can read feedback, keep your original, and revise separately.',
  'response-lab':
    'Select Replay my filed rule to test your recommendation. Compare the original reply with the replay, then select Save comparison to continue.',
  orientation:
    'Write one takeaway and select Save response, then Finish quest. Use the same note in the Canvas orientation check.',
};

export const guideAnchors = {
  intro: '[data-guide-anchor="intro"]',
  inspect: '[data-guide-anchor="inspect"]',
  choices: '.station-actions .choices',
  activity: '.station-actions :is(.choices, fieldset, textarea, button:not(:disabled))',
  continue: '[data-guide-anchor="continue"]',
  retry: '[data-guide-anchor="save-retry"]',
};

export type GuideCue = { target: string; title: string; description: string };

export function firstCaseCue({
  arriving,
  lastIntroLine,
  practice,
  fresh,
  readyToContinue,
}: {
  arriving: boolean;
  lastIntroLine: boolean;
  practice: boolean;
  fresh: boolean;
  readyToContinue: boolean;
}): GuideCue {
  if (arriving)
    return {
      target: guideAnchors.intro,
      title: lastIntroLine ? 'Start the investigation' : 'Next line',
      description: lastIntroLine
        ? 'Move to the supply table to examine the evidence.'
        : 'Use the right arrow to meet each character and learn their role.',
    };
  if (!fresh)
    return {
      target: guideAnchors.inspect,
      title: practice ? 'Inspect fresh attempt' : 'Inspect practice record',
      description: practice
        ? 'See what Eunseo tried on his own.'
        : 'Open the organizer’s notice, Eunseo’s request, and Pip’s draft.',
    };
  if (readyToContinue)
    return {
      target: guideAnchors.continue,
      title: 'Continue',
      description: 'Move to the next step after reading the feedback.',
    };
  return {
    target: guideAnchors.choices,
    title: 'Make your first choice',
    description: 'Choose what you would check before posting the sign.',
  };
}

export function findGuideTarget(root: HTMLElement | null, selector: string) {
  return Array.from(root?.querySelectorAll<HTMLElement>(selector) ?? []).find(
    (element) => element.getClientRects().length > 0 && !element.matches(':disabled'),
  );
}

export function activityInstructions(step: Step) {
  return controlInstructions[step.id] ?? step.help;
}

export function ActivityGuide({ step, onShowGuide }: { step: Step; onShowGuide?: () => void }) {
  return (
    <details className="activity-instructions">
      <summary>Activity instructions</summary>
      <p>{activityInstructions(step)}</p>
      <button className="text-button" type="button" disabled={!onShowGuide} onClick={onShowGuide}>
        Point to the next action
      </button>
    </details>
  );
}

export function ActivityTour({
  root,
  cue,
  onDismiss,
}: {
  root: RefObject<HTMLDivElement | null>;
  cue: GuideCue;
  onDismiss: () => void;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const retarget = () => setTarget(findGuideTarget(root.current, cue.target) ?? null);
    retarget();
    if (!root.current) return;
    const observer = new MutationObserver(retarget);
    observer.observe(root.current, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'open'],
    });
    return () => observer.disconnect();
  }, [root, cue.target, cue.title]);
  useEffect(() => {
    if (!target) return;
    const frame = requestAnimationFrame(() => target.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [target, cue.title]);
  if (!target?.isConnected || !target.matches(cue.target)) return null;
  return (
    <QuestTour
      key={cue.title}
      target={target}
      title={cue.title}
      description={cue.description}
      onDismiss={onDismiss}
    />
  );
}
