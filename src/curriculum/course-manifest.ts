// Stable week IDs keep Canvas URLs and checkpoint keys intact when the display order changes.
export const courseSequence = [
  'w01',
  'w02',
  'w03',
  'w04',
  'w05',
  'w06',
  'w07',
  'w08',
  'w09',
  'w10',
  'w11',
  'w12',
  'w13',
  'w14',
  'w15',
] as const;

type SyllabusEntry = readonly [title: string, topic: string, dates: string, assignment: string];

export const syllabus = {
  w01: ['The first evening', 'AI literacy', 'Jan 11–17', 'Orientation check (ungraded) · Jan 17'],
  w02: ['The tutor archive', 'History of AI in education', 'Jan 18–24', 'Case note 1 · Jan 24'],
  w03: ['What does the tutor know?', 'Learner models and adaptivity', 'Jan 25–31', 'Lab 1 · Jan 31'],
  w04: ['The first try', 'Productive failure and transfer', 'Feb 1–7', 'Case note 2 · Feb 7'],
  w05: ['Help after an attempt', 'Scaffolding and question-asking', 'Feb 8–14', 'Lab 2 · Feb 14'],
  w06: ['When to step back', 'Feedback, fading, and transfer', 'Feb 15–21', 'Peer studio 1 · Feb 21'],
  w07: ['What can we claim?', 'Design-based research', 'Feb 22–28', 'Case note 3 · Feb 28'],
  w08: ['Test, change, retest', 'Prototyping and testing', 'Mar 1–5', 'Lab 3 · Mar 5'],
  w09: [
    'The learner behind the chat',
    'AI ethics and responsible design',
    'Mar 15–21',
    'Case note 4 · Mar 21',
  ],
  w10: ['A prompt with boundaries', 'Generative AI and prompts', 'Mar 22–28', 'Peer studio 2 · Mar 28'],
  w11: ['When the check gets it wrong', 'Benchmarks and test harnesses', 'Mar 29–Apr 4', 'Lab 4 · Apr 4'],
  w12: ['When an agent should ask', 'AI agents and human oversight', 'Apr 5–11', 'Case note 5 · Apr 11'],
  w13: ['Stop the robot', 'Physical AI simulation', 'Apr 12–18', 'Case note 6 · Apr 18'],
  w14: ['The release review', 'Capstone playtest and revision', 'Apr 19–25', 'Peer studio 3 · Apr 25'],
  w15: ['What changed?', 'Synthesis and optional preview', 'Apr 26–27', 'Classes end Apr 27'],
} satisfies Record<(typeof courseSequence)[number], SyllabusEntry>;
