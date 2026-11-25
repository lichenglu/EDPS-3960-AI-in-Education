import { weekOneManifest, type StudioMission } from './manifest.ts';
import type { CastId } from './guides.ts';

export type StoryView = CastId | 'whole-room';

type OpeningScene = {
  speaker: CastId;
  view: StoryView;
  title: string;
  dialogue: string;
  concept?: StudioMission;
  narration?: boolean;
  demo?: boolean;
};

export const storyScenes: Record<(typeof weekOneManifest.opening)[number], OpeningScene> = {
  'open-house': {
    speaker: 'transcript',
    view: 'whole-room',
    narration: true,
    title: 'The day before open house',
    dialogue:
      'Tomorrow, visiting teachers will try five AI tools at our learning center. This morning, one tool made a transcript of our garden discussion. It looked ready to share, until a student pointed out that it had misspelled her name and included a private detail. Will you help us check what’s ready for tomorrow?',
  },
  'sound-desk': {
    speaker: 'transcript',
    view: 'transcript',
    narration: true,
    title: 'Can the recorder hear us?',
    dialogue:
      'At the Sound desk, you’ll listen and check what the recorder heard. This is Perception, the first of AI4K12’s Five Big Ideas. The ideas give us five ways to understand what AI does in the classroom.',
    concept: 'transcript',
  },
  'reading-corner': {
    speaker: 'reading',
    view: 'reading',
    title: 'Who would enjoy this book?',
    dialogue:
      'Our reading tool matches students to books. A short book can be a great match, or a terrible one. Help me see which preferences the tool uses and which details it leaves out.',
    concept: 'reading',
  },
  'exit-tickets': {
    speaker: 'tickets',
    view: 'tickets',
    title: 'What do the examples teach?',
    dialogue:
      'Two students can understand the same thing and say it differently. I’ve saved some exit tickets so we can test how the examples we give a sorter change whose meaning it picks up.',
    concept: 'tickets',
  },
  'hint-assistant': {
    speaker: 'hints',
    view: 'hints',
    title: 'Can a hint feel like help?',
    dialogue:
      'My puzzle assistant sometimes gives the whole answer and misses when someone is frustrated. Help me try a few messages and shape what it says back.',
    concept: 'hints',
  },
  'semester-toolkit': {
    speaker: 'toolkit',
    view: 'toolkit',
    title: 'Who lives with the decision?',
    dialogue:
      'An app might save us an hour and make students give up some privacy. Before we recommend a toolkit for the semester, let’s see who benefits and who takes on the risks.',
    concept: 'toolkit',
  },
  'three-perspectives': {
    speaker: 'gokhan',
    view: 'gokhan',
    demo: true,
    title: 'Three ways to check a tool',
    dialogue:
      'Digital literacy asks us to check a source. With AI, we can also change how a tool works and check who its output affects. Lee and Long call these perspectives User, Developer, and Critic. Try all three on a sample line.',
  },
};

export const openingScenes = weekOneManifest.opening.map((id) => storyScenes[id]);

export const openingDemo = [
  {
    action: 'Run',
    role: 'User',
    key: 'run',
    line: 'Jimena brought the class notes.',
    explanation: 'Use the recorder to draft a line, then check it against the clip.',
  },
  {
    action: 'Tune / Harness',
    role: 'Developer',
    key: 'tune',
    line: 'Ximena brought the class notes.',
    explanation: 'Add the correct spelling to the word bank and run the recorder again.',
  },
  {
    action: 'Settings & Audit',
    role: 'Critic',
    key: 'audit',
    line: 'A student brought the class notes.',
    explanation: 'Remove the student’s name from the copy you plan to share publicly.',
  },
] as const;
