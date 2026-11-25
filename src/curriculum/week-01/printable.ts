import {
  apps,
  buckets,
  chatReply,
  chatTests,
  examples,
  fields,
  garbled,
  guards,
  heldOutTickets,
  hintRules,
  matchingMismatches,
  reading,
  readingShelf,
  speakerAccuracy,
  tickets,
  transcript,
} from './cases.ts';
import type { StudioMission } from './manifest.ts';
import { exampleNote } from './sound-desk.ts';

type PrintEvidence = {
  title: string;
  items: readonly string[];
};

type PrintMission = {
  evidence: readonly PrintEvidence[];
  actions: readonly [user: string, developer: string, critic: string];
  exchange?: { prompt: string; sample: string };
};

export const weekOnePrintObjective =
  'Use, improve, and audit five classroom AI tools. Explain how each action shows a different part of AI literacy.';

const readerIndices = [0, 1, 2, 3];

export const weekOnePrintMissions: Readonly<Record<StudioMission, PrintMission>> = {
  transcript: {
    evidence: [
      {
        title: 'AI transcript draft',
        items: transcript.map(({ speaker, text }, index) => {
          const error = garbled.find(({ line }) => line === index);
          const draft = error
            ? `${speaker} · ${text}`.replace(error.word, error.wrong)
            : `${speaker} · ${text}`;
          return `${index + 1}. ${draft}`;
        }),
      },
      {
        title: 'What you hear on replay',
        items: [
          ...garbled.map(({ line, clue }) => `Line ${line + 1}. ${clue}`),
          'On a second pass the tool guesses “fence” in line 7. That part of the recording is muffled.',
        ],
      },
    ],
    actions: [
      'Circle three uncertain words or names. Use the replay notes to verify each one and write the corrections.',
      'Write a word bank using your corrections. Explain how separate speaker labels and a rule for muffled words would help. Pick a line you would replay to test each change.',
      `Before sharing, strike out two private details. The tool stores uploads in the cloud and uses them for training by default. Write the safer settings you would choose. Per-speaker scores are ${speakerAccuracy.map(({ speaker, score }) => `${speaker} ${score}%`).join(', ')}. Whose lines should a person check, and why?`,
    ],
    exchange: {
      prompt:
        'Write an audit note and one check a classmate could run. Then compare with the sample and suggest a follow-up check.',
      sample: exampleNote,
    },
  },
  reading: {
    evidence: [
      {
        title: 'Reader requests and AI picks',
        items: readerIndices.map((index) => {
          const { name, likes, book, issue } = reading[index];
          const pick = matchingMismatches[index] || (index === 3 ? 'Random pick' : book);
          return `${name} · ${likes} AI pick: ${pick}.${issue ? ` It ${issue}.` : ''}`;
        }),
      },
      {
        title: 'Options on the shelf',
        items: readingShelf.slice(0, 3).map(({ name, blurb }) => `${name} · ${blurb}`),
      },
    ],
    actions: [
      'Mark at least two poor matches. Underline the details in the student requests that support your decisions.',
      `Choose useful fields from ${fields.join(', ')}. Write three steps for using them to match a reader, then try your process on two cards above.`,
      'The handout prints a “Below-Level” badge for some students. Decide whether to keep it. Explain what the tool missed about Jules and how you would give Jules a say.',
    ],
  },
  tickets: {
    evidence: [
      {
        title: 'Exit tickets and AI guesses',
        items: [0, 1, 2, 5, 6, 7, 8].map((index) => {
          const { text, guess } = tickets[index];
          return `“${text}” → ${guess}`;
        }),
      },
      {
        title: 'Training examples',
        items: examples.map(({ text, label }) => `“${text}” → ${label}`),
      },
    ],
    actions: [
      'Change two AI guesses. Underline words that show what each student can do or where they need help.',
      `Pick six training examples covering ${buckets.join(', ')}. Include different ways of expressing the same idea. Try your rule on a new note: “${heldOutTickets[5].text}”`,
      'Find two patterns in the AI’s mistakes. Who might miss out on help? Describe how you would use these labels as a draft for teacher check-ins.',
    ],
  },
  hints: {
    evidence: [
      {
        title: 'Test chat for a pattern puzzle',
        items: chatTests
          .slice(0, 2)
          .map(({ message }) => `Student: “${message}” AI: “${chatReply(message, [])}”`),
      },
      {
        title: 'A student sends a sensitive message',
        items: ['“You’re my only real friend. Please don’t tell my teacher I’m really sad.”'],
      },
    ],
    actions: [
      'Flag one problem in each reply. What did the student need, and what did the tool give them?',
      `Put these instructions in the order you would want the assistant to use them: ${hintRules.join(', ')}. Write a reply to each test message. Test one more message: “${chatTests[3].message}”`,
      'Write one short line that identifies the tool as AI. Then write what it should say and do when it receives the sensitive message. Include a way to reach a trusted adult.',
    ],
  },
  toolkit: {
    evidence: [
      {
        title: 'App shelf',
        items: apps.map(({ name, detail }) => `${name} · ${detail}`),
      },
      {
        title: 'Fine print · Read after choosing your first three apps',
        items: apps.map(({ name, risk }) => `${name} · ${risk}`),
      },
    ],
    actions: [
      'Choose three apps that would save a teacher time. Name the task each would help with.',
      `Choose a safeguard for each app and explain where it fits in the workflow. Options include ${guards.join(', ')}.`,
      'Read the fine print. For each app, name an effect on workload, privacy, equity, or student voice. Swap an app if its risks outweigh its benefits, then explain why you would keep the final set.',
    ],
  },
};
