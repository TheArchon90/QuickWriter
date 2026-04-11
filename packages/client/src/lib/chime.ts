// Lazy singleton AudioContext — browsers block audio until a user gesture.
// The button click IS a user gesture, so initializing here works.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

/**
 * Play a soft single ping when a Claude rewrite lands. Very low volume,
 * quick envelope, sine wave, ~130ms total.
 */
export function playRewriteChime(): void {
  try {
    const audio = getCtx();
    const now = audio.currentTime;

    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, now); // E5

    const gain = audio.createGain();
    // Fast attack (5ms), exponential decay over ~130ms
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    // Silently fail — audio is cosmetic
  }
}
