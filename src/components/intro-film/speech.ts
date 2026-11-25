export function localEnglishVoice() {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return undefined;
  const local = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang));
  return local.find((voice) => voice.default) ?? local[0];
}

export function speakFilmCue(
  voice: SpeechSynthesisVoice,
  text: string,
  onFinish: (success: boolean) => void,
): (() => void) | undefined {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  let active = true;
  utterance.voice = voice;
  utterance.lang = voice.lang;

  function finish(success: boolean) {
    if (!active) return;
    active = false;
    onFinish(success);
  }

  utterance.onend = () => finish(true);
  utterance.onerror = () => finish(false);
  try {
    if (synth.paused) synth.resume();
    synth.speak(utterance);
  } catch {
    active = false;
    return undefined;
  }
  return () => {
    if (!active) return;
    active = false;
    synth.cancel();
  };
}
