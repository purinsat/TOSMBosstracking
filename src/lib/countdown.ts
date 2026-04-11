import type { Phase, PhaseTimings, Settings } from "@/lib/types";

export const PHASES: Phase[] = ["No event", "1", "2", "3", "4"];

export const DEFAULT_SETTINGS: Settings = {
  presets: [
    {
      name: "Preset 1",
      timings: { p12: 15, p23: 11, p34: 7, p4on: 3 },
    },
    {
      name: "Preset 2",
      timings: null,
    },
    {
      name: "Preset 3",
      timings: null,
    },
  ],
  soundVolume: 70,
  soundMuted: false,
};

export function getBaseCycleMinutes(timings: PhaseTimings): number {
  return timings.p12 + timings.p23 + timings.p34 + timings.p4on;
}

export function getTotalMinutes(
  phase: Phase,
  timings: PhaseTimings,
  noEventMinutes: number,
): number {
  if (phase === "1") return getBaseCycleMinutes(timings);
  if (phase === "2") return timings.p23 + timings.p34 + timings.p4on;
  if (phase === "3") return timings.p34 + timings.p4on;
  if (phase === "4") return timings.p4on;
  return noEventMinutes + getBaseCycleMinutes(timings);
}

export function parseDurationToMinutes(durationValue: string): number | null {
  const raw = durationValue.trim();

  if (/^\d{1,5}$/.test(raw)) {
    const totalMinutes = Number(raw);
    return Number.isNaN(totalMinutes) ? null : totalMinutes;
  }

  if (!/^\d{1,4}:[0-5]\d$/.test(raw)) return null;
  const [hours, minutes] = raw.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatDurationInput(durationValue: string): string | null {
  const raw = durationValue.trim();

  if (/^\d{1,5}$/.test(raw)) {
    const totalMinutes = Number(raw);
    if (Number.isNaN(totalMinutes)) return null;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const match = raw.match(/^(\d{1,4}):(\d{1,2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatMinutesSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getColorClasses(remainingMinutes: number): string {
  if (remainingMinutes < 25) {
    return "border-red-500 bg-red-950/30";
  }
  if (remainingMinutes <= 40) {
    return "border-yellow-500 bg-yellow-950/25";
  }
  return "border-green-500 bg-green-950/20";
}

export function getDynamicPhaseDisplay(
  startPhase: Phase,
  remainingSeconds: number,
  timings: PhaseTimings,
  noEventMinutes: number,
): string {
  if (remainingSeconds <= 0) return "On";

  const remainingMinutes = remainingSeconds / 60;
  const p2Start = timings.p23 + timings.p34 + timings.p4on;
  const p3Start = timings.p34 + timings.p4on;
  const p4Start = timings.p4on;

  if (startPhase === "No event") {
    const cycleStart = getBaseCycleMinutes(timings);
    if (remainingMinutes > cycleStart) return "No event";
    return getDynamicPhaseDisplay("1", remainingSeconds, timings, noEventMinutes);
  }

  if (startPhase === "1") {
    if (remainingMinutes > p2Start) return "1";
    if (remainingMinutes > p3Start) return "2";
    if (remainingMinutes > p4Start) return "3";
    return "4";
  }

  if (startPhase === "2") {
    if (remainingMinutes > p3Start) return "2";
    if (remainingMinutes > p4Start) return "3";
    return "4";
  }

  if (startPhase === "3") {
    if (remainingMinutes > p4Start) return "3";
    return "4";
  }

  return "4";
}
