export const knowledgeQuestions = [
  {
    id: 'perception',
    prompt:
      'A classroom caption says “gym” just as a chair scrapes over the speaker’s voice. What would give you the strongest evidence about what was said?',
    options: [
      'Run the same tool again and keep the word if it repeats it.',
      'Replay the original audio and ask the speaker if the word is still unclear.',
      'Check the room schedule and use the word that fits best.',
    ],
    correct: 1,
    correctFeedback:
      'The recording gives you evidence independent of the tool. If the sound is missing, the speaker can clarify what they said.',
    retryFeedback:
      'Try replaying the original audio. A repeated guess or a plausible room can still differ from what the speaker said.',
  },
  {
    id: 'tune-and-audit',
    prompt:
      'A tool keeps misspelling a club name. Its draft also includes a correctly transcribed private phone number. What addresses both issues before you share?',
    options: [
      'Fix the name in this copy and share it once the text matches the audio.',
      'Remove the number and ask the tool to produce a shorter transcript.',
      'Add the club name to the tool’s word list, test it, and remove the number from the public copy.',
    ],
    correct: 2,
    correctFeedback:
      'Testing the word list is a Developer move. Removing a private detail from a public copy is a Critic move.',
    retryFeedback:
      'These are two separate checks. Test a setting that helps the tool recognize the name, then decide whether the audience should see the number.',
  },
] as const;

export const exampleNote =
  'The overall score looked good, but Ximena still had the most errors. I would ask someone to review her lines against the clip before I share the transcript.';
