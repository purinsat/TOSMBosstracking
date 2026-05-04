import type { MutableRefObject } from "react";

export async function ensureAudioContextReady(
  audioContextRef: MutableRefObject<AudioContext | null>,
): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  const audioContextClass = window.AudioContext;
  if (!audioContextClass) return null;
  if (!audioContextRef.current) {
    audioContextRef.current = new audioContextClass();
  }
  if (audioContextRef.current.state === "suspended") {
    try {
      await audioContextRef.current.resume();
    } catch {
      return null;
    }
  }
  return audioContextRef.current;
}

export async function playTimeoutSound(
  audioContextRef: MutableRefObject<AudioContext | null>,
  volumePercent: number,
  muted: boolean,
  expiredCount: number,
): Promise<void> {
  if (muted || volumePercent <= 0 || typeof window === "undefined") return;
  const audioCtx = await ensureAudioContextReady(audioContextRef);
  if (!audioCtx) return;

  try {
    const count = Math.min(Math.max(expiredCount, 1), 3);
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = Math.min(1, volumePercent / 100) * 0.12;
    gainNode.connect(audioCtx.destination);

    const startAt = audioCtx.currentTime;
    for (let i = 0; i < count; i += 1) {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, startAt + i * 0.18);
      osc.connect(gainNode);
      osc.start(startAt + i * 0.18);
      osc.stop(startAt + i * 0.18 + 0.12);
    }
  } catch {
    // Ignore devices or browsers that block programmatic audio.
  }
}

/**
 * A short upward chime played when a new tracker is added by someone else.
 * Distinct from playTimeoutSound (which is a higher pure tone triplet).
 */
export async function playNewTrackerSound(
  audioContextRef: MutableRefObject<AudioContext | null>,
  volumePercent: number,
  muted: boolean,
): Promise<void> {
  if (muted || volumePercent <= 0 || typeof window === "undefined") return;
  const audioCtx = await ensureAudioContextReady(audioContextRef);
  if (!audioCtx) return;

  try {
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = Math.min(1, volumePercent / 100) * 0.08;
    gainNode.connect(audioCtx.destination);

    const startAt = audioCtx.currentTime;
    const tones = [523.25, 659.25]; // C5, E5 upward step
    tones.forEach((frequency, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, startAt + i * 0.1);
      osc.connect(gainNode);
      osc.start(startAt + i * 0.1);
      osc.stop(startAt + i * 0.1 + 0.12);
    });
  } catch {
    // Ignore devices or browsers that block programmatic audio.
  }
}
