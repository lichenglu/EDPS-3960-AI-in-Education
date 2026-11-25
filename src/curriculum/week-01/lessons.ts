import type { StudioMission } from './manifest.ts';
import { knowledgeQuestions as soundQuestions } from './sound-desk.ts';

type Question = {
  id: string;
  prompt: string;
  options: readonly [string, string, string];
  correct: 0 | 1 | 2;
  correctFeedback: string;
  retryFeedback: string;
};
type Lesson = {
  introTitle: string;
  videoHeading: string;
  practiceTitle: string;
  practiceIntro: string;
  minutes: readonly [intro: number, practice: number, check: number];
  why: string;
  question: string;
  keyPoints: readonly string[];
  perspectives: readonly [user: string, developer: string, critic: string];
  questions: readonly Question[];
};

export const weekOneLessons: Record<StudioMission, Lesson> = {
  transcript: {
    introTitle: 'How speech becomes text',
    videoHeading: 'Watch how speech becomes text',
    practiceTitle: 'Work through the garden clip',
    practiceIntro:
      'Work through the garden case in Run, Tune, and Audit. Try each task first. Use the feedback and hints when you need them.',
    minutes: [5, 45, 3],
    why: 'A wrong word can send the class to the wrong room. Check the recording before acting on a caption or sharing it.',
    question:
      'What happens between the microphone recording a sound and the tool choosing a word? What could make it choose the wrong one?',
    keyPoints: [
      'A microphone captures sound. Speech recognition looks for patterns in the recording to predict words. Noise or unfamiliar pronunciations can throw it off.',
      'Checking the source and considering the audience are familiar digital literacy practices. With an AI tool, you can also adjust a setting and test what changes.',
    ],
    perspectives: [
      'Check a caption against the original recording.',
      'Add a frequently misheard name to the word list, then test the change.',
      'Decide what the audience needs and check whose words the tool tends to mishear.',
    ],
    questions: soundQuestions,
  },
  reading: {
    introTitle: 'How recommendations are made',
    videoHeading: 'Watch how a recommendation starts',
    practiceTitle: 'Match readers to books',
    practiceIntro:
      'Generate suggestions for eight fictional readers. Compare each match with the student’s request, then test what changes when you give the tool better information.',
    minutes: [5, 9, 2],
    why: 'A school librarian asks what a student likes before recommending a book. A tool can only make suggestions from details it has and rules it follows.',
    question: 'Which details would help a tool tell a good match from a popular but unsuitable suggestion?',
    keyPoints: [
      'A recommender chooses a few promising items from a larger collection. It may use details about the items, a person’s interests, or patterns from other people’s choices.',
      'The details a tool can use are its representation. Its reasoning is how it compares those details to make a recommendation. A preference the tool never sees cannot guide the result.',
    ],
    perspectives: [
      'Compare a suggested book with what a reader asked for.',
      'Choose useful fields, such as interests and format, then run the matcher again.',
      'Remove labels that could stigmatize students and leave room for student choice.',
    ],
    questions: [
      {
        id: 'match-evidence',
        prompt:
          'A club recommender sends a student who wants quiet activities to the biggest club on campus. Which change is most likely to improve future suggestions?',
        options: [
          'Give clubs with more members extra weight.',
          'Record what kind of environment the student wants and compare it with each club’s description.',
          'Show the same suggestions in alphabetical order.',
        ],
        correct: 1,
        correctFeedback:
          'The tool needs both sides of the comparison. The student’s preference and the club’s environment can guide the match.',
        retryFeedback:
          'Popularity and ordering do not tell the tool whether an activity is quiet. Add information that represents the preference and the club.',
      },
      {
        id: 'missing-preference',
        prompt:
          'A reading tool has good information about a student’s interests, but it never asked whom the student wants to read with. What should the teacher do before assigning a group?',
        options: [
          'Ask the student and let their answer change the assignment.',
          'Use the highest-ranked group because the interests were recorded correctly.',
          'Treat a missing partner preference as a preference to read alone.',
        ],
        correct: 0,
        correctFeedback:
          'Student choice supplies context missing from the tool and gives the student a say in the outcome.',
        retryFeedback:
          'Rankings only reflect the information collected. Ask about the missing preference instead of filling it in for the student.',
      },
    ],
  },
  tickets: {
    introTitle: 'What a sorter learns from examples',
    videoHeading: 'Watch how training examples shape predictions',
    practiceTitle: 'Sort exit tickets',
    practiceIntro:
      'Compare a tool’s labels with what students actually wrote. Try a more varied set of teaching examples, then check who still gets misread.',
    minutes: [4, 9, 2],
    why: 'Teachers look for evidence of understanding when they read exit tickets. A sorter learns patterns from examples and can pick up shortcuts a teacher would miss.',
    question:
      'If all the examples labeled “Got It” sound confident, what might a sorter learn about students who write more cautiously?',
    keyPoints: [
      'Training data is the set of examples a tool learns from. A label tells the tool which group an example belongs to. A model can learn a misleading shortcut when its examples cover only a narrow range.',
      'Test on fresh examples that were kept out of training. Look at the kinds of mistakes it makes, including whose responses it misunderstands.',
    ],
    perspectives: [
      'Read the student’s explanation before accepting the suggested label.',
      'Add varied labeled examples and test on notes the sorter has never seen.',
      'Look for patterns in the errors and keep the results as a draft for teacher review.',
    ],
    questions: [
      {
        id: 'testing-learning',
        prompt:
          'A sorter gets all the exit tickets it trained on right. What would give the teacher better evidence that it learned something useful?',
        options: [
          'Run the same training tickets again to see if the score stays high.',
          'Remove the tickets where the sorter sounds uncertain.',
          'Test it on new tickets with varied ways of expressing the same understanding.',
        ],
        correct: 2,
        correctFeedback:
          'Fresh examples test whether the sorter applies what it learned beyond its training notes.',
        retryFeedback:
          'Repeating or removing familiar examples does not test how the sorter handles new responses. Keep a separate, varied set for testing.',
      },
      {
        id: 'uneven-mistakes',
        prompt:
          'A sorter often marks hesitant students as “Stuck,” even when they explain their reasoning. What is a good next move?',
        options: [
          'Use the labels for teacher check-ins and investigate which expressions the sorter gets wrong.',
          'Ask hesitant students to sound more confident so their tickets score higher.',
          'Trust the overall score if the sorter rarely makes other mistakes.',
        ],
        correct: 0,
        correctFeedback:
          'Teacher review protects students from a misleading label while you identify and test the pattern.',
        retryFeedback:
          'The model may be using tone as a shortcut. Read the reasoning, check that pattern, and review results before acting on them.',
      },
    ],
  },
  hints: {
    introTitle: 'What a chatbot hears in a request',
    videoHeading: 'Watch how chatbots build a reply',
    practiceTitle: 'Test a classroom hint assistant',
    practiceIntro:
      'Try student messages, inspect the replies, and test instructions for a chatbot that gives helpful hints. Check how it responds when a student needs a person.',
    minutes: [9, 8, 2],
    why: 'A tutor can ask what a learner tried before offering help. A chatbot can sound fluent while misunderstanding what the learner wants.',
    question: 'What could you put in a chatbot’s instructions to help it respond to a request for a hint?',
    keyPoints: [
      'A language model builds text from patterns it learned during training and the words and context it receives. A fluent reply can miss the goal of a request or the feeling behind it.',
      'Tell a hint assistant what kind of help to give. Test it on a direct question and on a frustrated reply. When a learner needs personal support, offer a way to reach a trusted person.',
    ],
    perspectives: [
      'Try realistic student messages and notice where the reply fails to help.',
      'Write rules for giving one hint and test how the chatbot follows them.',
      'Make the chatbot’s role clear and provide a way to reach a trusted adult.',
    ],
    questions: [
      {
        id: 'intent-and-hints',
        prompt:
          'A student says, “Can you give me a tiny hint?” The chatbot explains the whole answer. What instruction would you test first?',
        options: [
          'Ask what the student tried, then give one clue that leaves the answer for them.',
          'Make the full answer shorter and format it as a list.',
          'Give a solution immediately whenever a student says “help.”',
        ],
        correct: 0,
        correctFeedback:
          'Asking about the attempt helps the assistant choose a useful clue and leaves the thinking with the student.',
        retryFeedback:
          'The student asked for a way to keep thinking. Change how the chatbot decides what to reveal, then test that it honors the request.',
      },
      {
        id: 'trusted-person',
        prompt:
          'A learner tells a riddle chatbot they are upset and asks it to keep the conversation secret. What is the most helpful response?',
        options: [
          'Promise to keep the secret so the learner feels heard.',
          'Acknowledge the learner’s feelings, explain the chatbot’s role, and point them to a trusted adult.',
          'Offer another riddle to distract the learner.',
        ],
        correct: 1,
        correctFeedback: 'The student gets a supportive response and a route to a person who can help.',
        retryFeedback:
          'A riddle chatbot cannot provide the support a trusted adult can. Acknowledge the learner’s feelings and make that human option clear.',
      },
    ],
  },
  toolkit: {
    introTitle: 'Who benefits when schools adopt AI',
    videoHeading: 'Watch how AI creates benefits and trade-offs',
    practiceTitle: 'Build a toolkit for one semester',
    practiceIntro:
      'Choose tools for a fictional classroom, decide how people will use them, and test their effects on workload, privacy, equity, and student voice.',
    minutes: [5, 10, 2],
    why: 'A tool can save a teacher time and create new risks for students at the same time. School technology decisions have consequences for people who never chose the tool.',
    question: 'Who gains from an automated tool, and who might bear a cost that the school should check?',
    keyPoints: [
      'Automation can change how people spend their time and what information is collected. Look at who benefits, what data the tool needs, and who can still access the activity.',
      'Test safeguards such as a human check or a low-tech option. Some risks come from what a vendor does with data and may require choosing a different tool.',
    ],
    perspectives: [
      'Decide which tools would help with a classroom need.',
      'Set safeguards and compare the possible effects before adoption.',
      'Read the fine print and ask who pays a cost in privacy, access, or voice.',
    ],
    questions: [
      {
        id: 'toolkit-privacy',
        prompt:
          'A free lesson app saves preparation time, but its terms let it sell student-usage profiles. What should the school do before adopting it?',
        options: [
          'Adopt it because the teacher can correct any lesson errors.',
          'Run it after school so it does not disrupt class.',
          'Compare a tool with stronger data protections and check whether it meets the same classroom need.',
        ],
        correct: 2,
        correctFeedback:
          'A useful alternative can preserve the time benefit while reducing the privacy cost students would bear.',
        retryFeedback:
          'Reviewing the lessons or moving the activity to a different time does not change what the vendor does with student data.',
      },
      {
        id: 'access-and-voice',
        prompt:
          'Students like a new homework tool, but several cannot reliably get online at home. What would make the trial more useful to the teacher?',
        options: [
          'Offer an equivalent offline path and ask students using both options what helped or got in the way.',
          'Keep the online tool as the only option and use completion counts to judge engagement.',
          'Ask only students who finished online to suggest improvements.',
        ],
        correct: 0,
        correctFeedback:
          'An equivalent offline path keeps the task accessible. Feedback from both groups shows whose needs the trial is meeting.',
        retryFeedback:
          'Online completion counts can reflect internet access. Include students who use the offline path when you evaluate the trial.',
      },
    ],
  },
};
