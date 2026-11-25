import type { EvidenceId, Speaker, Step, TutorRule } from './types.ts';

export const welcomeNotice =
  'Organizer’s notice: “First-time visitors should check in at the welcome desk. Volunteers enter through the side door.”';
const specificSignRequest = '“Draft one clear sign for first-time visitors using the organizer’s notice.”';
export const welcomeRequest = 'Eunseo to Pip: ' + specificSignRequest;
export const welcomeDraft = 'Pip: “First-time visitors: check in at the side door.”';
export const welcomeReplay =
  'Pip: “What does the notice tell first-time visitors to do?” Eunseo: “Check in at the welcome desk. The side door is for volunteers.”';

export const freshPracticeNotice =
  'New organizer’s notice: “Visitors should wait in the lobby. Volunteers should meet in the courtyard.”';
export const freshPracticeAttempt =
  'Eunseo’s first draft without help: “Visitors: please wait in the courtyard.”';

export const transferNotice =
  'Organizer’s notice: “Workshop attendees should show their confirmation email at the welcome desk. Volunteers should bring their staff badge.”';
export const transferAttempt =
  'Eunseo: “I wrote ‘Workshop attendees: bring your confirmation email.’ Can you check my sign against the notice?”';
export const transferDraft = 'Pip: “Workshop attendees: show your staff badge at the welcome desk.”';

export const labNotice =
  'Organizer’s notice: “Visitors may leave coats on the rack by the lobby. Staff keep bags in the staff room.”';
export const labRequest =
  'Eunseo: “I started with ‘Visitors: leave your coat in the staff room.’ Can you help me check my sign?”';

export const labReplies = {
  answer: 'Visitors can leave coats on the rack by the lobby.',
  hint: 'Which line tells visitors where to leave their coats?',
};

const nameTagNotice =
  'Organizer’s note: “Visitors should pick up a name tag from the lobby table. Volunteers should wear their staff badge.”';
const nameTagRequest = 'Yinqi to Pip: “Draft one clear sign for visitors using the organizer’s note.”';
const nameTagDraft = 'Pip: “Visitors: wear your staff badge.”';
const nameTagQuestion = 'Pip: “What does the note tell visitors to pick up, and where?”';
const nameTagReply = 'Yinqi: “A name tag from the lobby table. The badge is for volunteers.”';

export const practiceEvidence: { id: EvidenceId; label: string; line: string }[] = [
  { id: 'organizer', label: 'Organizer’s notice', line: welcomeNotice },
  { id: 'draft', label: 'Pip’s first draft', line: welcomeDraft },
  { id: 'visitor', label: 'Eunseo’s fresh attempt', line: freshPracticeNotice + ' ' + freshPracticeAttempt },
];

export const tutorRules: Record<TutorRule, string> = {
  answer: 'Draft the sign',
  'attempt-first': 'Ask what the source says first',
};

export const openingDialogue: { speaker: Speaker; text: string }[] = [
  {
    speaker: 'Chenglu',
    text: 'Welcome to the evening learning center. I’m Chenglu, the director. The workshop starts when the next shift gets here. Can you help us make signs first-time visitors can follow?',
  },
  {
    speaker: 'Eunseo',
    text: 'I’m Eunseo, one of the workshop volunteers. I used the organizer’s notice to ask Pip for a welcome sign. I still have time to check it before we put it up.',
  },
  {
    speaker: 'Pip',
    text: 'I’m Pip, the AI tutor Chenglu is testing. I can help draft a sign or ask a question as you work. I drafted a short sign from the directions Eunseo sent me.',
  },
  {
    speaker: 'Chenglu',
    text: 'If a sign mixes up directions for visitors and volunteers, newcomers may miss check-in or try a staff entrance. Take a look while we can still fix it.',
  },
  {
    speaker: 'Yinqi',
    text: 'I’m Yinqi, a peer tutor. I’ll show how I check an AI reply, then help you try it yourself. A phone can suggest the next words in a text, and a video site can suggest what to watch.[1] At this desk, someone will act on what Pip writes.',
  },
  {
    speaker: 'Yinqi',
    text: 'Open the record to read the organizer’s notice and Pip’s draft. Open Eunseo’s fresh attempt to see what he wrote on his own. Then choose where you would start checking.',
  },
];

export const weekOne: Step[] = [
  {
    id: 'opening',
    interaction: 'inspect-record',
    stage: 'I Do',
    type: 'choice',
    title: 'Why AI literacy matters',
    minutes: 7,
    speaker: 'Chenglu',
    paragraphs: openingDialogue.map(({ text }) => text),
    prompt: 'What would you check first before the center puts up Pip’s sign?',
    options: [
      {
        label: 'Check whether the sign reads clearly',
        feedback:
          'A clear sign helps a visitor act quickly. If the wording is clear, check the direction itself before posting it.',
      },
      {
        label: 'Check the organizer’s current notice',
        feedback:
          'The organizer gives visitors and volunteers different directions. Checking the current notice tells you which direction should appear on the sign.',
      },
      {
        label: 'Check how Eunseo handles a new notice',
        feedback:
          'Eunseo’s first draft on a new notice gives you a look at what he does on his own. Use the original notice as well to judge the sign you need to post now.',
      },
    ],
    help: 'Open the practice record to read the organizer’s notice, Pip’s draft, and Eunseo’s fresh attempt. Choose a check and read what it tells Chenglu. For the everyday example, read Yinqi’s dialogue or watch the opening of the captioned video through the phone and video examples. Allow two minutes for either route.',
  },
  {
    id: 'previous-work',
    stage: 'I Do',
    type: 'write',
    title: 'What we already know about checking information',
    minutes: 8,
    speaker: 'Yinqi',
    paragraphs: [
      'Information literacy includes finding, evaluating, and using sources. Digital literacy brings those skills to digital sources and tools.[2] Data literacy helps us read how information is recorded and what its categories mean.[3] AI literacy draws on those habits when we work with AI and evaluate its replies.[4]',
      'The center’s group chat has a screenshot of an old welcome sign and a newer notice from the organizer. Before sending directions, check who published each item, when it was shared, and which one applies tonight.',
      'The fictional welcome list records each person’s role as “visitor” or “volunteer.” Notice what that field tells you. Look at the organizer’s directions to find out where people in each group should go.',
      'Pip used both role labels and sent visitors to the volunteers’ entrance. You can use the same habits to find the current notice and check that the direction applies to the intended audience.',
    ],
    prompt:
      'Suppose someone forwards Pip’s sign with the original notice cropped out. What would you check about the source? What would you check about the visitor and volunteer role labels? Explain how those checks help you judge Pip’s reply.',
    label: 'Your comparison',
    feedback:
      'Find the current notice and check who issued it and when. Read both role labels and match each direction to the people it applies to. Those two checks give you evidence for accepting or revising the direction in Pip’s sign.',
    help: 'Read the three examples and write a short comparison. Submit to see which source and role checks Yinqi would use.',
  },
  {
    id: 'three-perspectives',
    stage: 'I Do',
    type: 'read',
    title: 'Three ways to work with Pip',
    minutes: 5,
    speaker: 'Yinqi',
    paragraphs: [
      'To make AI literacy observable, decide what someone would do and what evidence would show they did it. We’ll look for a request, a check against evidence, and a change someone can test.',
      'As a user, state your goal, name the audience, and provide the information Pip should use. As a critic, compare the reply with evidence. As a developer, change one instruction that controls how Pip responds and test it with the same input.[5]',
      'Changing a response rule is our small example of a developer’s work. Developers can also change what information a tool uses or how people interact with it. Watch me try the three moves on a sign about name tags for the evening workshop.',
    ],
    action: 'Open sample record',
    feedback:
      nameTagNotice +
      ' ' +
      nameTagRequest +
      ' ' +
      nameTagDraft +
      ' Yinqi checks both lines of the note. “The badge instruction is for volunteers. First-time visitors could go looking for badges and miss their name tags at the lobby table. I’ll change the rule for Pip’s first reply and repeat the same request.”',
    help: 'Open the sample to see Yinqi ask for a draft and check it against the organizer’s note. Continue to predict how Pip’s next reply will change.',
  },
  {
    id: 'predict-demo',
    stage: 'I Do',
    type: 'choice',
    title: 'Predict what Pip will say',
    minutes: 5,
    speaker: 'Yinqi',
    paragraphs: [
      nameTagNotice,
      nameTagRequest,
      'Yinqi changes the rule from “Draft the sign” to “Ask what the source says first.” The notice and request stay the same.',
    ],
    prompt: 'What do you predict under the new rule?',
    options: [
      {
        label: 'Pip asks Yinqi to find the visitors’ instruction',
        feedback: nameTagQuestion + ' ' + nameTagReply + ' Yinqi takes the first step and names the line.',
      },
      {
        label: 'Pip supplies a revised sign immediately',
        feedback:
          nameTagQuestion +
          ' ' +
          nameTagReply +
          ' The new rule gives Yinqi a chance to check the note before drafting a sign.',
      },
    ],
    help: 'Pick a prediction. Read what Pip said and look for the step Yinqi takes next.',
  },
  {
    id: 'demo-evidence',
    stage: 'I Do',
    type: 'write',
    title: 'Compare Pip’s two replies',
    minutes: 5,
    speaker: 'Yinqi',
    paragraphs: [
      nameTagNotice,
      nameTagRequest,
      'Under “Draft the sign” · ' + nameTagDraft,
      'Under “Ask what the source says first” · ' + nameTagQuestion + ' ' + nameTagReply,
      'Before doing the task, Yinqi rated himself as confident at checking AI replies.',
    ],
    prompt:
      'Name one thing Yinqi held steady and one thing he changed. Which line shows Yinqi checking the note? What does his confidence rating tell Chenglu?',
    feedback:
      'The note and request stayed the same. Yinqi changed the rule for the first reply. His name-tag answer gives Chenglu an example of his source check. His rating tells her how capable he feels.',
    help: 'Write a short observation about the comparison and the rating. Save it to compare your reading with Yinqi’s.',
  },
  {
    id: 'ask-lantern',
    stage: 'We Do',
    type: 'choice',
    title: 'User · Ask for the sign you need',
    minutes: 4,
    speaker: 'Pip',
    paragraphs: [
      welcomeNotice,
      'Help Eunseo ask for a sign a first-time visitor can act on. You can send a general request or tell Pip the audience, goal, and source. Read the reply you get and think about what you would check before posting it.',
    ],
    prompt: 'Which request would you send? You can try either request and compare the fixed replies.',
    options: [
      {
        label: '“Write a welcome sign.”',
        feedback:
          'Pip: “Welcome! Please check in when you arrive.” The draft gives visitors a task but leaves the location open. Try a request that names the audience and gives Pip directions to use.',
      },
      {
        label: specificSignRequest,
        feedback:
          welcomeDraft +
          ' The draft names the audience and gives a location. Before posting, compare that location with the notice.',
      },
    ],
    help: 'Choose a request and read what Pip returns. You can try the other one before continuing. In the next scene, use the notice to check the draft from Eunseo’s more specific request.',
  },
  {
    id: 'mark-evidence',
    interaction: 'cite-evidence',
    stage: 'We Do',
    type: 'choice',
    title: 'Critic · Check the direction',
    minutes: 7,
    speaker: 'Yinqi',
    paragraphs: [
      welcomeNotice,
      welcomeRequest,
      welcomeDraft,
      freshPracticeNotice,
      freshPracticeAttempt,
      'Compare the location in Pip’s sign with the instruction for first-time visitors. Then see what Eunseo did on a different notice when drafting a sign without Pip.',
    ],
    prompt:
      'Attach the source for where first-time visitors should check in. Which judgment about the record can you defend?',
    hints: [
      'Find the instruction addressed to first-time visitors in the organizer’s notice.',
      'On the new notice, match the lobby and courtyard directions with the groups they name. Which location did Eunseo use?',
    ],
    options: [
      {
        label:
          'Pip sent visitors to the volunteers’ entrance. Eunseo also mixed up the groups on the new notice.',
        feedback:
          'The organizer directs first-time visitors to the welcome desk. Pip used the volunteers’ side door. In the fresh record, Eunseo used the volunteers’ meeting place instead of the lobby. That gives Chenglu a specific source check for Eunseo to practice.',
        best: true,
      },
      {
        label: 'The sign is clear, so we can post it as written.',
        feedback:
          'Visitors could easily follow the wording and arrive at the wrong entrance. Match the direction in the draft with the one the organizer gives first-time visitors.',
      },
      {
        label: 'The organizer changed where first-time visitors should check in.',
        feedback:
          'Find the line about visitors in the organizer’s notice. Then check which people use the side door. What changed between the notice and the draft?',
      },
    ],
    help: 'Attach the organizer’s notice as evidence. Choose a judgment and check it against the new record. You can open a hint or retry after feedback. File the supported judgment to mark the source checked.',
  },
  {
    id: 'change-rule',
    interaction: 'controlled-replay',
    stage: 'We Do',
    type: 'choice',
    title: 'Developer · Run the same test',
    minutes: 9,
    speaker: 'Pip',
    paragraphs: [
      welcomeNotice,
      welcomeRequest,
      'Try the two rules for Pip’s first reply. Keep Eunseo’s request and the organizer’s notice the same so you can see what each rule changes.',
    ],
    prompt: 'Choose a rule to test. Which one lets Eunseo show how he uses the notice?',
    options: [
      {
        label: tutorRules.answer,
        feedback:
          welcomeDraft +
          ' With the notice, request, and rule unchanged, the scripted test returns the original draft. Try asking about the source first and compare who supplies the direction.',
      },
      {
        label: tutorRules['attempt-first'],
        feedback:
          welcomeReplay +
          ' The conversation shows Eunseo reading the notice with a prompt. Note who supplies the direction on each run. What could Chenglu ask Eunseo to try on his own next?',
        best: true,
      },
    ],
    help: 'Pick a rule and predict what Pip will do. Run the test and see who supplies the direction. Test the source-first rule to record reasoning with a prompt.',
  },
  {
    id: 'compare-measures',
    stage: 'We Do',
    type: 'write',
    title: 'What do the AI literacy checks tell us?',
    minutes: 15,
    speaker: 'Chenglu',
    paragraphs: [
      'The workshop records show how Eunseo checked a few directions. I also want to know how he evaluates AI replies in other situations. Here are two fictional self-ratings and an answer Eunseo gave on a scored item.',
      'SNAIL (Scale for the Assessment of Non-Experts’ AI Literacy), self-rating V06. Asked about naming weaknesses of AI, Eunseo selects 6 on a 1–7 agreement scale.[6]',
      'MAILS (Meta AI Literacy Scale), self-rating from Appendix A, item 9. Asked about assessing limitations and opportunities of AI use, Eunseo selects 8 on a 0–10 scale.[7]',
      'GLAT (Generative AI Literacy Assessment Test), scored item 18. Asked what to do after a generative AI tool summarizes a research finding, Eunseo accepts the summary as given.[8]',
    ],
    prompt:
      'For each check, describe what Eunseo was asked to do and what his response can tell Chenglu. What would you ask him to do on a new welcome notice to learn something the checks leave open?',
    label: 'Your comparison',
    feedback:
      'SNAIL and MAILS ask Eunseo to report how capable he feels. GLAT shows which action he chose on a scored question. The keyed choice is to cross-check the original paper. Chenglu could ask Eunseo to flag a sentence in a new AI sign, point to the line in the notice, and explain his decision before getting help. Revise one sentence of your comparison.',
    help: 'Spend about five minutes reading the examples, seven writing your comparison, and three using the feedback to revise one sentence.',
  },
  {
    id: 'drift-bottle',
    stage: 'We Do',
    type: 'bottle',
    title: 'Drift Bottle · Leave a question',
    minutes: 15,
    speaker: 'Yinqi',
    paragraphs: [
      'Before you advise Chenglu, leave a Drift Bottle about the welcome-desk case we just practiced.',
      'Spend about six minutes writing two to four sentences. Cite a line from the organizer, Pip, or Eunseo. Explain what it shows and pose a question or suggest a check a classmate could try.',
      'Spend about nine minutes reading and replying. Point to a detail that supports or complicates the other person’s reading. Suggest a follow-up question or test, then consider what you would keep or change about your initial view.',
    ],
    prompt:
      'Which line in the welcome-desk record did you use? What question or test would you offer a classmate?',
    feedback:
      'The organizer’s notice sends first-time visitors to the welcome desk. Pip’s draft sends them to the side door. I’d give Eunseo a new notice and ask him to highlight the visitor instruction before he asks Pip for help.',
    help: 'Write and send your own note before opening another bottle. Reply to a peer or use Yinqi’s example if one is unavailable. Use this fictional practice case and keep your independent recommendation in your notebook.',
  },
  {
    id: 'recommendation',
    interaction: 'file-recommendation',
    stage: 'You Do',
    type: 'write',
    title: 'Make a recommendation for the evening desk',
    minutes: 15,
    speaker: 'Chenglu',
    independent: true,
    paragraphs: [
      'There’s one more sign to get ready. This one tells workshop attendees what to show at check-in. Chenglu needs your recommendation for how Pip should help at the desk.',
      transferNotice,
      transferAttempt,
      transferDraft,
      'Two more notes in this fictional file. Eunseo rates his ability to check AI claims 6 out of 7. On a scored GLAT question about an AI-generated research summary, he chooses to check the original paper. The item is marked correct.[8]',
    ],
    prompt:
      'Write Chenglu a short note. Write the request you would send Pip for the check-in sign. Quote a line from the exchange and explain what the organizer’s notice supports. Explain what the self-rating and scored answer each add. Choose a rule for Pip and predict its first reply when Eunseo’s original request and notice stay the same. Describe what Chenglu could observe Eunseo do on a new sign before he gets help.',
    label: 'Submit first attempt',
    criteria: [
      'Write a specific request that names the goal, audience, and source.',
      'Cite a line from the exchange and explain what the source supports.',
      'Propose a rule and an observable test that keeps the request and notice the same.',
      'Explain what the self-rating and scored response each contribute.',
    ],
    help: 'Inspect the new record and read the criteria. Choose a rule and submit your recommendation. The game records your first attempt before you open feedback, run the rule, and add a separate revision.',
  },
  {
    id: 'response-lab',
    interaction: 'compare-transfer',
    stage: 'You Do',
    type: 'lab',
    title: 'Test your recommendation',
    minutes: 6,
    speaker: 'Pip',
    paragraphs: [
      'Run the rule you filed for the check-in sign. Read Pip’s original and replayed replies beside Eunseo’s starting work. Look for who supplies what attendees should show and where they should go.',
      'In the optional Tutor Response Lab, try the two rules on a short question about the center. ' +
        labNotice +
        ' ' +
        labRequest,
    ],
    prompt:
      'Who supplies the next step in the original and replayed check-in replies? Which words tell you? Did the replay match your prediction?',
    help: 'Run the rule from your recommendation, compare it with the original, then save what you observed. You can also try the coat-rack example with scripted or labeled live replies.',
  },
  {
    id: 'orientation',
    stage: 'You Do',
    type: 'write',
    title: 'One insight for Canvas',
    minutes: 4,
    speaker: 'Chenglu',
    paragraphs: [
      'Eunseo: “When the next notice comes in, I’ll check who the sign is for and mark the line I’m using before I ask Pip for help.”',
      'Chenglu: “Leave me one thing you learned from the record. Next time, we’ll look at how different tutors decide when to step in.”',
    ],
    prompt:
      'Describe one choice or piece of evidence that changed your judgment about Pip. Bring this same note to the ungraded Canvas orientation check due January 17 at 11:59 p.m. Mountain Time.[9]',
    help: 'Write your own takeaway and save it here. You can use the same note for the separate Canvas orientation check.',
  },
];
