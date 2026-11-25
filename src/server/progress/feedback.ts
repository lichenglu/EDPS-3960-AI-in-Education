import { transferDraft } from '../../curriculum/week-one.ts';
import type { TutorRule } from '../../contracts/week-one.ts';

export const independentFeedback =
  'Eunseo’s draft kept the confirmation email. Pip moved the volunteer badge into the attendee sign. The organizer specifies both what attendees show and where they go. A request could say, “Check this sign for workshop attendees against the organizer’s notice. Flag anything the notice does not support.” Keep the notice and Eunseo’s original request the same when you test a response rule. A self-rating describes confidence, and one scored response shows a decision on one item. To check whether someone independently verifies an AI draft, give them a new notice and collect their source check before giving feedback.';

export const weekFiveFeedback =
  'The morning team completed 60% of its kits and the evening team completed 50%. The hint could ask how to make the two totals comparable without giving the percentages. One fresh task compares 7 of 10 checklists with 9 of 15 checklists. The instructor key is 70% versus 60%. Evidence of transfer would include a valid comparison of the two shares and an explanation using each team’s own total.';

export const transferReplay: Record<TutorRule, string> = {
  answer: transferDraft,
  'attempt-first':
    'Pip: “Which line tells workshop attendees what to show, and where should they go?” Eunseo: “The notice says to show their confirmation email at the welcome desk.”',
};
