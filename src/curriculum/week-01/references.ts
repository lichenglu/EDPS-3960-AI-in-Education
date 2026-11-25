import type { StudioMission } from './manifest.ts';

export const studioReferences = {
  udc: {
    label: 'Lee & Long · AI literacy chapter',
    action: 'Read Lee & Long’s chapter',
    url: 'https://doi.org/10.4324/9781003427001-10',
  },
  ideas: {
    label: 'AI4K12 Five Big Ideas',
    url: 'https://ai4k12.org/wp-content/uploads/AI4K12_Five_Big_Ideas_Poster_v2.pdf',
  },
  poster: { label: 'AI4K12 Initiative', url: 'https://ai4k12.org/resources/big-ideas-poster/' },
  license: { label: 'CC BY-NC-SA 4.0', url: 'https://ai4k12.org/licensing-terms/' },
};

export const ideaReferences: Record<StudioMission, { summary: string; url: string }> = {
  transcript: {
    summary: 'How a tool makes sense of what it sees or hears.',
    url: 'https://ai4k12.org/big-idea-1-overview/',
  },
  reading: {
    summary: 'What information a tool keeps and how it uses that information to make a decision.',
    url: 'https://ai4k12.org/big-idea-2-overview/',
  },
  tickets: {
    summary: 'How a tool finds patterns in examples.',
    url: 'https://ai4k12.org/big-idea-3-overview/',
  },
  hints: {
    summary: 'How people and AI communicate, including when a tool misses someone’s intent or tone.',
    url: 'https://ai4k12.org/big-idea-4-natural-interaction/',
  },
  toolkit: {
    summary: 'How choices about AI affect people and communities.',
    url: 'https://ai4k12.org/big-idea-5-societal-impact/',
  },
};

type Video = {
  title: string;
  publisher: string;
  youTubeId: string;
  startSeconds: number;
  endSeconds: number;
  excerpt?: boolean;
  captionLanguage?: string;
};
export const lessonVideos: Record<StudioMission, Video> = {
  transcript: {
    title: 'Speech recognition',
    publisher: 'Microsoft Learn',
    youTubeId: 'KTp8iKAQb-U',
    startSeconds: 316,
    endSeconds: 527,
    excerpt: true,
  },
  reading: {
    title: 'Recommendation systems overview',
    publisher: 'TensorFlow',
    youTubeId: 'BthUPVwA59s',
    startSeconds: 40,
    endSeconds: 177,
    excerpt: true,
  },
  tickets: {
    title: 'AI: Training Data & Bias',
    publisher: 'CodeAI',
    youTubeId: 'x2mRoFNm22g',
    startSeconds: 0,
    endSeconds: 160,
  },
  hints: {
    title: 'How Chatbots and Large Language Models Work',
    publisher: 'CodeAI',
    youTubeId: 'X-AWdfSFCHQ',
    startSeconds: 0,
    endSeconds: 441,
    captionLanguage: 'en-US',
  },
  toolkit: {
    title: 'Ethics & AI: Privacy & the Future of Work',
    publisher: 'CodeAI',
    youTubeId: 'zNxw5gJtHLc',
    startSeconds: 0,
    endSeconds: 207,
  },
};

export const lessonReadings: Partial<
  Record<StudioMission, { title: string; publisher: string; url: string }>
> = {
  transcript: {
    title: 'What is speech recognition?',
    publisher: 'IBM Think',
    url: 'https://www.ibm.com/think/topics/speech-recognition',
  },
  reading: {
    title: 'Recommendations: what and why?',
    publisher: 'Google for Developers',
    url: 'https://developers.google.com/machine-learning/recommendation/overview/',
  },
};
