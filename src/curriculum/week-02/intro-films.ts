import { weekTwoReferences } from './references.ts';

const media = '/activities/week-two';

export const weekTwoIntroFilm = {
  title: 'Water under the door',
  stageTitle: 'I Do',
  context:
    'How did computers come to tutor students? Imagine I’m helping Sam use clues in a story to explain why Mara hurried outside. I’ll show how three tutoring tools could respond to the same answer from Sam.',
  guidingQuestion: 'What can I tell about Sam’s thinking after each exchange?',
  video: media + '/under-the-door.mp4',
  captions: media + '/under-the-door.en.vtt',
  poster: media + '/under-the-door.jpg',
  scenes: [
    {
      id: 'orientation',
      lines: [
        'Imagine I’m teaching Sam to use clues in a story.',
        'Could a computer tell how Sam figured out an answer?',
        'I’ll borrow three ideas from the history of tutoring and try them on the same story.',
      ],
      annotation: '',
      description:
        'An open book reads “I Do” and “History of AI in education.” Sam sits with a teacher, then at a computer. The page turns to the story “Water under the door” as a paper cottage rises beside a river.',
    },
    {
      id: 'flood',
      lines: ['Sam reads these two sentences.', 'Water crept under the door.'],
      annotation: '',
      description: 'Rain lashes a doorway. A thin sheet of water crosses the sill.',
    },
    {
      id: 'escape',
      lines: [
        'Mara grabbed her brother’s coat and hurried him outside.',
        'I ask, “Why was Mara in a hurry?”',
      ],
      annotation: '',
      description: 'Mara takes up a coral coat and the two figures hurry through the doorway.',
    },
    {
      id: 'answer',
      lines: ['Sam writes, “The house was flooding.”', 'That fits. What gave Sam that idea?'],
      annotation: 'Sam’s first answer',
      description:
        'The notebook shows the teacher’s question on the left and Sam’s handwritten answer on the right.',
    },
    {
      id: 'shutter',
      lines: [
        'An early teaching machine could reveal a prepared answer.',
        'Sam could check whether the two answers agree.',
      ],
      annotation: 'Compare the answers',
      description:
        'A shutter slides aside. The printed answer, “Floodwater was coming inside,” appears below Sam’s words.',
    },
    {
      id: 'model',
      lines: [
        'Some computer tutors tracked each step a student took.',
        'For this story, I’d ask, “Which words were your clue?”',
      ],
      annotation: 'Ask for a clue',
      description:
        'A trail of ink connects Sam’s answer to the tutor’s question, “Which words were your clue?”',
    },
    {
      id: 'clue',
      lines: ['Sam underlines “Water crept under the door.”', 'Now I can see the clue Sam used.'],
      annotation: 'Sam’s clue',
      description: 'An underline travels beneath the words Sam chose from the story.',
    },
    {
      id: 'conversation',
      lines: [
        'A conversational tutor could ask a follow-up question.',
        '“Why would water on the floor make Mara hurry?”',
        'Sam explains, “They had to get out before the water rose.”',
      ],
      annotation: 'Explain the clue',
      description:
        'The highlighted clue leads to a follow-up question. Sam’s reply explains why rising water put Mara and her brother in danger.',
    },
    {
      id: 'archive',
      lines: ['In We Do, open the archive.', 'What could each tool tell from a student’s work?'],
      annotation: '',
      description:
        'The reader’s page slides into a drawer. Light catches the brass on a wall of archive drawers.',
    },
  ],
  sources: weekTwoReferences.filter(({ id }) => ['skinner', 'anderson', 'doroudi', 'openai'].includes(id)),
} as const;
