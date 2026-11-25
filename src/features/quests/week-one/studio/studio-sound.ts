import { useEffect, useRef } from 'react';

export function useStudioSound(muted: boolean) {
  const context = useRef<AudioContext | null>(null);
  const lastCue = useRef(-Infinity);

  useEffect(
    () => () => {
      if (context.current?.state !== 'closed') void context.current?.close().catch(() => {});
    },
    [],
  );

  function enableSound() {
    if (!('AudioContext' in window)) return;
    try {
      context.current ??= new AudioContext();
      void context.current.resume().catch(() => {});
    } catch {
      /* Visual feedback is available independently. */
    }
  }

  function playLockedCue() {
    const audio = context.current;
    if (muted || !audio || audio.state !== 'running' || audio.currentTime - lastCue.current < 0.22) return;
    const start = audio.currentTime;
    lastCue.current = start;
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(330, start);
    tone.frequency.setValueAtTime(233, start + 0.075);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.012);
    gain.gain.linearRampToValueAtTime(0.045, start + 0.072);
    gain.gain.linearRampToValueAtTime(0, start + 0.18);
    tone.connect(gain).connect(audio.destination);
    tone.onended = () => {
      tone.disconnect();
      gain.disconnect();
    };
    tone.start(start);
    tone.stop(start + 0.18);
  }

  return { enableSound, playLockedCue };
}
