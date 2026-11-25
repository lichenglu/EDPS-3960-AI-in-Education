import { weekTwoQuestId, weekTwoRationaleMaxLength, weekTwoVersion } from '../../contracts/week-two.ts';
import { courseCast } from '../characters.ts';
import type { WeekTwoReferenceId } from './references.ts';

const { chenglu, eunseo, yinqi } = courseCast;

export const weekTwoYearIds = ['1958', '1970', '1980', '1995', '2008', '2019', '2022', '2025'] as const;
export type WeekTwoMilestoneId = (typeof weekTwoYearIds)[number];
export type WeekTwoYear = WeekTwoMilestoneId;

type WeekTwoChoice = { id: string; label: string };

export type WeekTwoOption = WeekTwoChoice & { feedback: string; best?: boolean };

export type WeekTwoMilestone = {
  id: WeekTwoMilestoneId;
  year: WeekTwoYear;
  stage: 'We Do';
  minutes: number;
  title: string;
  summary: string;
  setup: string;
  previewEvidence?: { title: string; body: string };
  prompt: string;
  options: readonly WeekTwoOption[];
  hint: string;
  reveal: string;
  revealPanels?: readonly { title: string; body: string }[];
  sourceIds: readonly WeekTwoReferenceId[];
};

export const weekTwoOnboarding =
  'Read the clue for this year. Make a choice and select “Try this move” to open the record. Read the feedback and try another option if you like. You can return to any year you’ve opened.';

const algebraCase = `A workshop volunteer, ${eunseo.name}, starts with 3(x + 2) = 18 and writes 3x + 2 = 18. The 3 multiplies both terms inside the parentheses.`;

export const weekTwoMilestones: readonly WeekTwoMilestone[] = [
  {
    id: '1958',
    year: '1958',
    stage: 'We Do',
    minutes: 6,
    title: 'Teaching machines',
    summary: 'A mechanical device gives immediate feedback.',
    setup: `In this paper reconstruction, ${yinqi.name}, your peer tutor, shows a strip that reads “The capital of Peru is ___.” A learner writes “Lima,” then slides a cover aside. The printed answer underneath is “Lima.”`,
    prompt: 'What does this single check tell you?',
    options: [
      {
        id: 'matches-answer',
        label: 'Whether the response matches the printed answer',
        feedback:
          'The two words match. The strip shows the learner which answer was expected. To find out how they knew, you could ask them.',
        best: true,
      },
      {
        id: 'knows-strategy',
        label: 'How the learner figured out the answer',
        feedback:
          'The learner might recall the capital or look it up. Either way, the strip would show the same match.',
      },
      {
        id: 'predicts-new-problem',
        label: 'Whether the learner can answer a new geography question on their own',
        feedback:
          'This check gives you one response about Peru. A new question without help would tell you more about what the learner knows.',
      },
    ],
    hint: 'Compare what the learner writes with what the machine’s window can show.',
    reveal:
      'In 1958, B. F. Skinner described teaching machines that gave learners a series of short items and showed the expected answer after each response. The feedback came from material someone had prepared. These devices came before intelligent tutoring systems.',
    sourceIds: ['skinner'],
  },
  {
    id: '1970',
    year: '1970',
    stage: 'We Do',
    minutes: 8,
    title: 'SCHOLAR',
    summary: 'A tutor uses links between facts to support a dialogue.',
    setup: `${yinqi.name} shows four facts: Lima is the capital of Peru. Peru is in South America. Quito is the capital of Ecuador. Ecuador is in South America. Use the facts together to trace a route from Lima to the continent.`,
    prompt: 'Which question can this simple tutor answer from the facts it has?',
    options: [
      {
        id: 'link-known-facts',
        label: 'Is the country whose capital is Lima in South America?',
        feedback:
          'The computer can answer yes. It follows the link from Lima to Peru, then the link from Peru to South America.',
        best: true,
      },
      {
        id: 'guess-travel-time',
        label: 'How long does it take to travel from Lima to Quito?',
        feedback:
          'The map names the cities and countries. Travel time would require a route and a way to estimate time.',
      },
      {
        id: 'guess-largest-city',
        label: 'Which city in South America has the most residents?',
        feedback:
          'The map tells you the location of each place. It contains no counts of residents to compare.',
      },
    ],
    hint: 'Draw an arrow for each fact. Follow only the arrows you have.',
    reveal:
      'Jaime Carbonell described SCHOLAR in 1970. It linked facts about South American geography. The program could ask the learner a question, and the learner could ask a question back. The linked facts determined which questions the program could answer.',
    sourceIds: ['carbonell', 'doroudi'],
  },
  {
    id: '1980',
    year: '1980',
    stage: 'We Do',
    minutes: 7,
    title: 'Mindstorms and Logo',
    summary: 'Learners give the computer instructions and revise what they make.',
    setup:
      'A drawing turtle faces right on a grid. The goal is to move two squares right and then two squares up. The commands are Forward 2, Turn right 90°, Forward 2. Trace that path with a finger or pencil, then choose one command to change.',
    prompt: 'Which change will make the turtle draw the intended path?',
    options: [
      {
        id: 'turn-left',
        label: 'Change the right turn to a left turn',
        feedback:
          'The turtle moves two squares right, turns to face up, and moves two squares up. Try tracing both paths to see how the change affects the drawing.',
        best: true,
      },
      {
        id: 'shorten-first-move',
        label: 'Change the first Forward 2 to Forward 1',
        feedback: 'The first segment becomes shorter. The right turn still sends the turtle down the page.',
      },
      {
        id: 'remove-turn',
        label: 'Remove the turn',
        feedback: 'The turtle keeps facing east and the two moves make one long horizontal line.',
      },
    ],
    hint: 'Point a finger to the right as if it were the turtle. Make the turn from that direction and see where your finger points.',
    reveal:
      'In Mindstorms (1980), Seymour Papert described how children could explore ideas by making things with computers. With Logo, learners gave commands to a drawing turtle, studied the result, and changed the commands. This work developed alongside computers that guided learners through problems.',
    sourceIds: ['papert', 'doroudi'],
  },
  {
    id: '1995',
    year: '1995',
    stage: 'We Do',
    minutes: 12,
    title: 'Cognitive Tutors',
    summary: 'A tutor uses a model of problem-solving steps to choose feedback.',
    setup: `${algebraCase} In this simulation, the tutor knows two possible first moves: distribute the 3 to both terms, or divide both sides of the equation by 3. It can recognize a missing multiplier in the distribution step.`,
    prompt: `Which reply uses ${eunseo.name}’s written step to suggest a next move?`,
    options: [
      {
        id: 'target-missing-multiplier',
        label: 'You multiplied x by 3. What happens when you multiply the 2 by 3 as well?',
        feedback:
          'The tutor sees that the multiplier is missing from the second term. Its question points to the 2 and leaves the calculation for Eunseo.',
        best: true,
      },
      {
        id: 'give-final-answer',
        label: 'The value of x is 4.',
        feedback:
          'The value is correct. This reply leaves the missing multiplier unexplained and gives little evidence that the learner can repair the step.',
      },
      {
        id: 'say-try-again',
        label: 'That is incorrect. Try again.',
        feedback:
          'The learner knows the move needs work. The tutor can use the evidence in the entered step to point to a specific place to look.',
      },
    ],
    hint: 'Say the original expression as “three times the whole sum.” Compare that with the terms in the entered step.',
    reveal:
      'In 1995, Anderson and colleagues described cognitive tutors for subjects including algebra. They called the process of matching a learner’s actions to a model “model tracing.” A cognitive tutor uses rules for how someone might solve a problem. It compares each step the learner enters with those rules. When it recognizes a step or a common error, it can give a specific hint.',
    revealPanels: [
      {
        title: 'Two routes the tutor can recognize',
        body: 'Distribute to get 3x + 6 = 18, or divide both sides by 3 to get x + 2 = 6. This simulation models both moves.',
      },
      {
        title: 'The next action belongs to the learner',
        body: `After the hint, ${eunseo.name} writes 3x + 6 = 18 in this replay. The correction shows what ${eunseo.name} did with help. A fresh problem without hints would show what ${eunseo.name} can do independently.`,
      },
    ],
    sourceIds: ['anderson', 'kulik-fletcher'],
  },
  {
    id: '2008',
    year: '2008',
    stage: 'We Do',
    minutes: 7,
    title: 'Betty’s Brain',
    summary: 'Students teach an agent and check what it learned from their map.',
    setup:
      'In this simplified river model, more algae provides more food for small fish. More food leads to more small fish. The agent’s map says “more algae → less food” and “more food → more small fish.” Ask what happens to the fish when algae increase. Compare both links in the explanation with the river model.',
    previewEvidence: {
      title: 'Prediction from the current map',
      body: '“I predict fewer small fish. My map says more algae leads to less food, and less food leads to fewer small fish.”',
    },
    prompt: 'Which change would make the agent’s prediction and explanation fit the river model?',
    options: [
      {
        id: 'repair-algae-food-link',
        label: 'More algae → more food for small fish',
        feedback:
          'Betty would now predict more small fish. Trace the route she could use to explain it: more algae leads to more food, which leads to more small fish.',
        best: true,
      },
      {
        id: 'reverse-food-fish-link',
        label: 'More food → fewer small fish',
        feedback:
          'With this change, the agent would predict more fish because more algae would mean less food, and less food would mean more fish. The final prediction happens to match, but both links in that explanation differ from the river model.',
      },
      {
        id: 'leave-links',
        label: 'Keep both links and ask Betty again',
        feedback:
          'Betty still predicts fewer small fish because her map says more algae means less food. Inspecting her explanation shows which link needs a change.',
      },
    ],
    hint: 'Follow the two links in order. Compare each one with the facts about this simplified river model.',
    reveal:
      'In 2008, Krittaya Leelawong and Gautam Biswas described how students taught Betty by putting cause-and-effect links on a map. Betty could answer a question and show which links she followed. Students could use the explanation to revise the map and ask again.',
    sourceIds: ['leelawong-biswas'],
  },
  {
    id: '2019',
    year: '2019',
    stage: 'We Do',
    minutes: 7,
    title: 'Mindspark and adaptive practice',
    summary: 'Practice changes in response to evidence about each learner.',
    setup:
      'Two fictional seventh-grade learners are practicing algebra. Learner A solves x + 4 = 9, then gets stuck at 3(x + 2) = 18. Learner B solves 3(x + 2) = 18 and explains how the 3 multiplies both terms. Use their work to choose what each learner should practice next.',
    prompt: 'Which practice plan uses the evidence from both learners’ work?',
    options: [
      {
        id: 'choose-individual-practice',
        label: 'Give A short distribution practice and B a harder problem that uses distribution',
        feedback:
          'A can practice the move that caused difficulty. B can apply it in a more demanding problem. The next attempt for each learner can help you check the placement.',
        best: true,
      },
      {
        id: 'advance-both-by-grade',
        label: 'Give both learners the same harder problem because they are in the same grade',
        feedback:
          'Grade provides context. Their work gives you more specific evidence about whether each is ready to move on from distribution.',
      },
      {
        id: 'repeat-all-basics',
        label: 'Send both learners back to basic one-step equations',
        feedback:
          'That earlier skill is already visible in the records. Revisit the first place where each learner needs support or a greater challenge.',
      },
    ],
    hint: 'Find the latest step each learner can do and the earliest place each one needs help or a new challenge.',
    reveal:
      'In a study published in 2019, a lottery offered students in Delhi, India, a place at Mindspark after-school centers. The program combined small-group instruction with adaptive computer practice, which changed to match each learner’s current level. Students offered a place through the lottery did better on the study’s math and Hindi tests.',
    revealPanels: [
      {
        title: 'What the study compared',
        body: 'The lottery changed access to the whole program, including the software and instructor-led sessions. The result tells us about that combination in this setting.',
      },
    ],
    sourceIds: ['muralidharan'],
  },
  {
    id: '2022',
    year: '2022',
    stage: 'We Do',
    minutes: 6,
    title: 'ChatGPT enters public use',
    summary: 'A general-purpose chatbot can generate explanations and respond to follow-ups.',
    setup: `${eunseo.name} sends a chatbot the same algebra attempt and adds, “I multiplied the x. Can you help me without giving the answer?” Read the three possible replies. Each is written for this simulation.`,
    prompt: 'Which reply responds to the request and gives the learner a step to try?',
    options: [
      {
        id: 'ask-a-grounded-question',
        label: 'The 3 multiplies the whole sum. What does 3 multiply besides x?',
        feedback:
          'This reply uses the learner’s comment to point back to the expression. The learner still has to work out which term to multiply and do the calculation.',
        best: true,
      },
      {
        id: 'give-correct-solution',
        label: 'The corrected equation is 3x + 6 = 18, so x = 4.',
        feedback:
          'The result is correct. The reply gives both the repair and the answer after the learner requested a hint.',
      },
      {
        id: 'accept-wrong-step',
        label: 'Your expansion is correct because the 3 only applies to x.',
        feedback:
          'Check the hint against the expression. The parentheses group both terms, so the 3 multiplies each one.',
      },
    ],
    hint: 'Check the result against the expression, then check how much of the next step each reply does for the learner.',
    reveal:
      'OpenAI released ChatGPT as a public research preview on November 30, 2022. A learner could ask for an explanation and follow up in everyday language. Check that a reply is accurate and gives the kind of help the learner asked for.',
    sourceIds: ['openai', 'rismanchian-doroudi'],
  },
  {
    id: '2025',
    year: '2025',
    stage: 'We Do',
    minutes: 7,
    title: 'What happens after the AI is removed?',
    summary: 'A field experiment separates performance with help from performance without it.',
    setup:
      'A high school math study compared three groups. One practiced with a general GPT-4 chatbot, one with a GPT-4 tutor designed with teacher input, and one without AI. Both AI groups scored higher on practice problems than the group without AI. Everyone then took the exam without AI.',
    prompt:
      'What do you predict for the group that used the general chatbot when it takes the exam without AI?',
    options: [
      {
        id: 'predict-lower',
        label: 'It scores lower than the group that practiced without AI',
        feedback:
          'That is what the researchers found. During practice, a score reflects what students can do with the available help. On this exam, it reflects what students did on their own.',
        best: true,
      },
      {
        id: 'predict-similar',
        label: 'It scores about the same as the group that practiced without AI',
        feedback:
          'That was plausible before seeing the data. In this study, the general chatbot group scored lower when the tool was removed.',
      },
      {
        id: 'predict-higher',
        label: 'It scores higher because its practice score was higher',
        feedback:
          'The general chatbot group scored higher while the tool was available. When they took the exam on their own, they scored lower than the group that had practiced without it.',
      },
    ],
    hint: 'Consider what the learner might do while help is available and what changes when that help is removed.',
    reveal:
      'In 2025, Bastani and colleagues reported what students did during practice and what they did on an exam without help. Keep the two sets of scores separate as you compare the results.',
    revealPanels: [
      {
        title: 'During practice · AI available to both AI groups',
        body: 'Both groups with GPT-4 scored higher on the practice problems than the group without AI.',
      },
      {
        title: 'On the exam · No AI for any group',
        body: 'The general chatbot group scored lower than the group that practiced without AI. The exam comparison between the guided tutor group and the group that practiced without AI was inconclusive.',
      },
    ],
    sourceIds: ['bastani', 'rismanchian-doroudi'],
  },
];

export const weekTwoReplay = {
  title: 'Replay the same learner attempt',
  minutes: 8,
  setup: `${algebraCase} All three simulated tutors receive the same exercise and written step. For each reply, identify the information the tutor used, the help it gave, and the work it left for the learner.`,
  prompt: 'How does each system respond to the same step?',
  cards: [
    {
      id: 'cognitive-tutor',
      title: 'Cognitive tutor',
      observes: 'The written step and the rules for solving this equation.',
      reply: '“You multiplied x by 3. What happens to the 2?”',
      whatNext: 'Gives a hint tied to the current step and waits for another attempt.',
      limit: 'The tutor may miss a valid step that is outside its model.',
    },
    {
      id: 'adaptive-practice',
      title: 'Adaptive practice',
      observes: 'An incorrect response on an exercise labeled as distribution practice.',
      reply: '“Try a shorter distribution problem next.”',
      whatNext: 'Chooses the next practice item using this result.',
      limit:
        'The score shows whether the step was correct. More work or an explanation would help identify why the learner made the error.',
    },
    {
      id: 'generative-tutor',
      title: 'Generative tutor',
      observes: 'The problem and the written step in the conversation.',
      reply: '“Think of three copies of the whole group. What are you making three copies of?”',
      whatNext: 'Generates a follow-up question using the wording of the conversation.',
      limit:
        'The conversation can help the tutor respond. A new problem would give evidence of what the learner can do on their own.',
    },
  ],
  options: [
    {
      id: 'step-next-chat',
      label:
        'One checks the current step, one selects a next problem, and one generates a conversational reply.',
      feedback:
        'Those are the three decisions shown. A single system can combine these approaches. A separate attempt would help you find out what the learner can do independently.',
      best: true,
    },
    {
      id: 'same-action',
      label: 'They all make the same tutoring decision because they see the same written step.',
      feedback:
        'All three get the same attempt. Compare which part of the attempt each one uses and what help it offers.',
    },
    {
      id: 'chat-mastery',
      label:
        'The conversational tutor is the only one that can verify the learner has mastered distribution.',
      feedback:
        'A targeted question can invite the learner to show understanding. In this replay, each tool sees one attempt. A new task can give additional evidence.',
    },
  ] satisfies readonly WeekTwoOption[],
  hint: 'Compare what each tutor does immediately after the same incorrect line.',
  sourceIds: ['anderson', 'muralidharan', 'openai'] satisfies readonly WeekTwoReferenceId[],
};

export const weekTwoDriftBottle = {
  title: 'Drift Bottle · Compare tutor choices',
  minutes: 8,
  setup: `Use the guided distribution case. Write your own recommendation first. Then read a classmate’s note or the example from ${yinqi.name}, and reply with a follow-up test. You can move on while responses to your note are pending.`,
  prompt: `Which of the three scripted tutors would you try first for ${eunseo.name}’s algebra error? Use one observation from the replay and name one thing you still want to test.`,
  example: `I’d start with the cognitive tutor. It uses the missing multiplier in ${eunseo.name}’s line to ask about the 2. Next I’d ask ${eunseo.name} to expand 4(x + 3) without the tutor and check whether both terms are multiplied by 4.`,
  replyPrompt: 'Name what the note’s evidence supports. Suggest one useful change or a follow-up check.',
};

export const weekTwoFuture = {
  title: 'Design the next tutor',
  minutes: 20,
  setup: `${chenglu.name}, the learning center director, wants a tutoring plan for next week’s workshop. A new learner writes 4x + 5 = 17, then writes 4x = 22 and says, “I moved the five.” The goal is for the learner to explain why doing the same thing to both sides keeps an equation balanced.`,
  prompt:
    'Choose an idea from the timeline, a decision a person should keep, and a way to check for learning. Explain how those choices would work in this case.',
  rationalePrompt:
    'Describe one job for the AI, one decision a person should keep, and a task the learner will try without the tutor. Use the assigned reading and one observation from the archive to explain your reasoning. Say what result would make you revise your design.',
  rationaleMaxLength: weekTwoRationaleMaxLength,
  criteria: [
    'Name the tutoring approach and describe what the tutor should do next in this case.',
    'Explain which decision you would leave to the learner or teacher.',
    'Use Anderson et al. (1995) and one observation from the archive to justify your recommendation.',
    'Give a specific task the learner can try without the tutor. Say what you would look for and what finding would make you revise your design.',
  ],
  concepts: [
    { id: 'step-checker', label: 'Compare the current step with a model of how to solve the problem' },
    { id: 'adaptive-practice', label: 'Choose the next practice item from the learner’s work' },
    { id: 'conversation-coach', label: 'Generate a question using the learner’s explanation' },
    { id: 'teachable-agent', label: 'Ask the learner to teach an agent and check its answer' },
    { id: 'teacher-assistant', label: 'Suggest a follow-up question for the teacher to review' },
  ] satisfies readonly WeekTwoChoice[],
  humanDecisions: [
    { id: 'learner-requests-help', label: 'The learner decides when to request another hint' },
    { id: 'teacher-sets-limits', label: 'The teacher sets how much of the solution the tutor may show' },
    {
      id: 'teacher-reviews-escalations',
      label: 'The teacher reviews a repeated difficulty before changing the plan',
    },
  ] satisfies readonly WeekTwoChoice[],
  evidence: [
    { id: 'new-problem-alone', label: 'The learner solves a new equation without the tutor' },
    {
      id: 'explain-reasoning',
      label: 'The learner independently explains why a move keeps both sides equal',
    },
    {
      id: 'later-recheck',
      label: 'The learner revisits a different equation on a later day without the tutor',
    },
  ] satisfies readonly WeekTwoChoice[],
  placeholder:
    'I would have the tutor… I would leave this decision to… For an independent test I would ask the learner to… I would revise my design if…',
  feedback:
    'Read your proposal again. Check that the learner has a step to take, that a person keeps the decision you named, and that your test shows what the learner can do without help. Use the case evidence to explain how you would interpret the result.',
  sourceIds: ['anderson', 'doroudi', 'bastani'] satisfies readonly WeekTwoReferenceId[],
};

export const weekTwoQuickCheck = {
  prompt:
    'A learner copies the final answer a chatbot provides and submits it correctly. What would give you stronger evidence of learning?',
  options: [
    {
      id: 'fresh-attempt-without-ai',
      label: 'Ask the learner to solve and explain a new problem without the chatbot',
      feedback:
        'A fresh unassisted attempt shows what the learner can do independently at that point. An explanation helps you see how they did it.',
      best: true,
    },
    {
      id: 'same-answer-with-chatbot',
      label: 'Ask the chatbot for the answer again and check that it matches',
      feedback:
        'A matching result helps you check the tool’s response. To learn more about the learner’s own reasoning, ask for a fresh independent attempt.',
    },
  ] satisfies readonly WeekTwoOption[],
};

export const weekTwoLesson = {
  id: weekTwoQuestId,
  version: Number(weekTwoVersion),
  title: 'The Tutor Archive',
  objective:
    'Compare what a cognitive tutor, an adaptive practice system, and a generative tutor can see in a learner’s work and how each uses it. Propose a way to check what the learner can do on their own.',
  intro:
    'I’ll model how a teacher decides what to say after a reader answers, then show how tutoring programs have approached that decision. In We Do, you’ll open the archive and investigate a historical example.',
  introMinutes: 2,
  onboarding: weekTwoOnboarding,
  stageMinutes: { 'I Do': 2, 'We Do': 76, 'You Do': 20 },
  milestones: weekTwoMilestones,
  replay: weekTwoReplay,
  driftBottle: weekTwoDriftBottle,
  future: weekTwoFuture,
  quickCheck: weekTwoQuickCheck,
  introSourceIds: ['doroudi', 'rismanchian-doroudi'] satisfies readonly WeekTwoReferenceId[],
  assignment: {
    title: 'Case Note 1',
    due: 'January 24 at 11:59 p.m. Mountain Time',
    instructions:
      'Submit your case note separately in Canvas. Use Anderson et al. (1995) and one observation from the case to justify the tutor’s next move. Propose a task that would let you check what the learner can do independently.',
  },
} as const;
