import type { Step } from '../types.ts';
import { courseCast } from '../characters.ts';
import { tutoringReference } from './references.ts';

export const weekFiveVersion = 1;
const { chenglu, yinqi, eunseo, pip } = courseCast;

export const weekFive: Step[] = [
  {
    id: 'why-attempt-first',
    stage: 'I Do',
    type: 'choice',
    title: 'Why ask for a first attempt?',
    minutes: 7,
    speaker: 'chenglu',
    paragraphs: [
      `The center is preparing materials for a weekend workshop. ${eunseo.name}, the volunteer who will lead it, can copy a correct answer from ${pip.name}, the center’s AI tutor. ${chenglu.name}, the center director, wants to know whether the tutor can help him explain his own next move.`,
      `${yinqi.name}, the peer tutor, will show how to look at a learner’s starting point before choosing a hint. You’ll test the idea and design a fresh transfer task.`,
    ],
    prompt: 'What would give the tutor the clearest starting point for a useful hint?',
    options: [
      {
        label: 'Ask the learner to show what they tried',
        feedback:
          'An attempt can expose a specific idea or an obstacle. A tutor can use that evidence to choose a next question.',
      },
      {
        label: 'Ask only whether they feel stuck',
        feedback:
          'That tells the tutor the learner wants help. A starting step, even an incomplete one, can give the tutor more evidence about which help to offer.',
      },
    ],
    help: `Read the workshop situation and choose the evidence you would ask for. Compare your choice with ${chenglu.name}’s explanation.`,
  },
  {
    id: 'scaffolding',
    stage: 'I Do',
    type: 'write',
    title: 'What human tutors do',
    minutes: 8,
    speaker: 'yinqi',
    paragraphs: [
      'Wood, Bruner, and Ross watched a human tutor help young children build a difficult structure. They described ways a tutor can reduce the demands of a task, call attention to an important detail, or demonstrate a step. This is an example of scaffolding.',
      `${pip.name}’s attempt-first rule is our design application of that idea. It uses a learner’s first move to ask a targeted question, adds more support if needed, and leaves room for another attempt.`,
    ],
    prompt:
      'Think of a tutor giving directions for a difficult task. What could the tutor take care of to reduce confusion? What should the learner try?',
    feedback:
      'A tutor could point to or organize the relevant information, then ask the learner to decide how to use it. The useful division depends on the learner’s current attempt and what the task is meant to teach.',
    sources: [tutoringReference],
    help: 'Read the tutoring example and write one choice the tutor could make, plus one decision the learner should keep.',
  },
  {
    id: 'paint-demonstration',
    stage: 'I Do',
    type: 'write',
    title: 'Model a hint for the paint mix',
    minutes: 15,
    speaker: 'yinqi',
    paragraphs: [
      'A paint mix uses 3 parts blue for every 5 parts yellow. How many parts blue go with 15 parts yellow?',
      `${eunseo.name}: “Yellow went up by 10, so I added 10 to blue and got 13.” ${yinqi.name} pauses before replying. The learner has shown an addition strategy, so the hint can focus on the size and number of batches.`,
    ],
    prompt: `Predict what ${yinqi.name} could ask first to help ${eunseo.name} see the batches. What information would tell you he is ready to retry?`,
    feedback: `${yinqi.name} asks, “How many batches of 5 parts yellow make 15?” ${eunseo.name} finds 3 batches and works out 3 × 3 = 9 parts blue. The hint gives him a way to start and leaves the multiplication for him. For a fresh task, ${yinqi.name} could ask ${eunseo.name} to explain a 4-to-7 paint mix when he has 21 parts of the second color, then review the reasoning after his first attempt.`,
    help: `Read the learner’s attempt first. Write a question that could help with the next move, then compare it with ${yinqi.name}’s worked transcript.`,
  },
  {
    id: 'guided-attempt',
    stage: 'We Do',
    type: 'tutor',
    title: 'Try the map-scale task',
    minutes: 20,
    speaker: 'pip',
    paragraphs: [
      `${pip.name} is trying an attempt-first rule. You can begin by describing any useful starting step, such as making a table or comparing groups.`,
      'Map scale: 2 centimeters on the map represents 5 kilometers on the ground. A trail is 12.5 kilometers. How long is it on the map?',
      `${eunseo.name}’s practice note: “The distance rose by 7.5. I added 7.5 to 2 centimeters and got 9.5 centimeters.”`,
    ],
    prompt: `Show how you would start or explain what you think ${eunseo.name} should check first. Record an attempt to unlock the first hint.`,
    hints: [
      'What scale factor would change 5 kilometers into 12.5 kilometers? Apply the same factor to the map length.',
      'A table starts with 5 km → 2 cm and 10 km → 4 cm. Find the map length for 2.5 km, then combine it with the length for 10 km.',
    ],
    feedback:
      'The trail measures 5 cm. You can use 12.5 ÷ 5 = 2.5 and multiply 2 cm by 2.5. You can also combine 4 cm for 10 km with 1 cm for 2.5 km. The useful hint connects the two amounts without filling in the final map length.',
    help: 'Enter a genuine start, even if it is incomplete. Then try one hint or retry your reasoning. A second hint gives a more concrete way to organize the quantities.',
  },
  {
    id: 'compare-hints',
    stage: 'We Do',
    type: 'choice',
    title: 'Choose a useful next question',
    minutes: 15,
    speaker: 'yinqi',
    paragraphs: [
      `Return to ${eunseo.name}’s map attempt: “The distance rose by 7.5, so I added 7.5 to the map length.” Imagine testing the tutor’s next reply.`,
      'Pick a reply, read its likely effect in this fictional case, and compare it with your guided run.',
    ],
    prompt: `Which reply works from the evidence in ${eunseo.name}’s first attempt and leaves him something meaningful to do?`,
    options: [
      {
        label: 'The map length is 5 centimeters.',
        feedback: `${eunseo.name} can copy the answer. This reply gives little evidence about whether he can use the scale himself.`,
      },
      {
        label: 'Try again.',
        feedback: `${eunseo.name} knows his answer needs work. He could repeat the same addition because the reply gives him no direction for the next step.`,
      },
      {
        label: 'What factor takes 5 kilometers to 12.5 kilometers?',
        feedback: `The question draws attention to multiplication and leaves ${eunseo.name} to find and apply the factor. If he is still stuck, the tutor can offer a partly completed table.`,
        best: true,
      },
    ],
    help: 'Select a candidate reply and read its likely effect. Try another if the learner has too much or too little information to take a meaningful next step.',
  },
  {
    id: 'drift-bottle',
    stage: 'We Do',
    type: 'bottle',
    title: 'Drift Bottle · Compare two hints',
    minutes: 15,
    speaker: 'yinqi',
    paragraphs: [
      'Use the guided map example only. Share which hint you would offer first and one sign that tells you to make your next hint more specific.',
      `Open a classmate’s note or the sample from ${yinqi.name}. Point to evidence in the guided transcript, then propose a test of the hint they suggest.`,
    ],
    prompt:
      'What first hint would you use for the map-scale attempt, and when would you increase the support?',
    feedback: `I’d first ask how many 5-kilometer portions fit into 12.5 kilometers. If ${eunseo.name} still adds the same amount in both columns, I’d offer an incomplete scale table and ask him to fill the missing row.`,
    help: 'Send your suggestion for the guided map case. Then reply to a peer or the sample. Keep your fresh independent design private until you finish it.',
  },
  {
    id: 'independent-design',
    stage: 'You Do',
    type: 'write',
    title: 'Design a tutor response and a fresh transfer task',
    minutes: 20,
    speaker: 'chenglu',
    independent: true,
    paragraphs: [
      'The morning workshop team completed 12 of 20 kits. The evening team completed 15 of 30 kits.',
      'A learner says, “The evening team finished more kits, so it completed a bigger share of its work.”',
      'Design a short tutor exchange for this case and a fresh, separate comparison the learner can try independently.',
    ],
    prompt:
      'Write an opening prompt that invites a first attempt, a hint you would give after the quoted attempt, and a new task the learner can try independently. Keep the worked answer in your instructor notes and explain what response would count as evidence.',
    label: 'Submit first attempt',
    criteria: [
      'Invite a meaningful first step before giving a hint.',
      'Use the learner’s comparison of counts and leave the calculation for the learner.',
      'Write a new comparison with different numbers and no hints on the learner’s first attempt.',
      'Give a correct answer key and explain what would show the learner understands the comparison.',
    ],
    help: 'Read the entire case and criteria, then write your own tutor and transfer design. Submit to see worked feedback. You can record a separate revision after that.',
  },
  {
    id: 'lab-handoff',
    stage: 'You Do',
    type: 'read',
    title: 'Take your design to Lab 2',
    minutes: 5,
    speaker: 'chenglu',
    paragraphs: [
      'Bring your tutor design and separate transfer task to Lab 2 in Canvas. Use them to build an attempt-first prototype with the starter code, editable template, or equivalent format described in the Canvas assignment.',
      'Test at least one sample response. Note what happened, which part of the learner’s reasoning the hint addresses, and what the learner still has to do.',
      'Follow the Lab 2 instructions and submit your artifact and short behavior note in Canvas by February 14 at 11:59 p.m. Mountain Time.',
    ],
    help: 'Read the handoff and finish this quest. Use Canvas for the Lab 2 assignment, rubric, and submission.',
  },
];
