export type IntroVisual = 'workshop' | 'evidence' | 'machine' | 'knowledge' | 'horizon';

export type IntroScene = {
  id: string;
  title: string;
  duration: number;
  narration: string;
  description: string;
  visual: IntroVisual;
  labels?: readonly string[];
};

export type IntroFilm = {
  id: string;
  title: string;
  guidingQuestion: string;
  voiceLabel: string;
  scenes: readonly IntroScene[];
  sources: readonly { label: string; url: string }[];
};
