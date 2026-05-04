import { parseDurationToMinutes } from "@/lib/countdown";
import type { PhaseTimings, Settings, Tracker } from "@/lib/types";

export type PresetSlot = 1 | 2 | 3;

export type ParsedQuickCommand = {
  mapLv: number;
  ch: number;
  phase: Tracker["phase"];
  noEventMinutes: number;
  presetSlot: PresetSlot;
  totalMinutesOverride?: number;
};

export type ParsedCustomCommand = {
  mapLv: number;
  ch: number;
  countdownMinutes: number;
  presetSlot: PresetSlot | null;
};

export const MIN_MAP_LV = 10;
export const MAX_MAP_LV = 190;
export const MIN_CH = 1;
export const MAX_CH = 30;

export function isValidLvCh(mapLv: number, ch: number): boolean {
  return (
    Number.isInteger(mapLv) &&
    Number.isInteger(ch) &&
    mapLv >= MIN_MAP_LV &&
    mapLv <= MAX_MAP_LV &&
    ch >= MIN_CH &&
    ch <= MAX_CH
  );
}

export function parsePresetSlot(raw: string | undefined): PresetSlot | null {
  if (!raw) return null;
  const numeric = Number(raw);
  if (numeric === 1 || numeric === 2 || numeric === 3) return numeric;
  return null;
}

/**
 * Accepts three flexible shapes used by the app's command inputs:
 *   - Whole minutes: "30"
 *   - H:MM: "2:12"
 *   - Minute-only colon form: ":30" (0-59)
 * Returns null on any invalid shape.
 */
export function parseFlexibleDuration(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;

  if (/^:\d{1,2}$/.test(raw)) {
    const mins = Number(raw.slice(1));
    if (Number.isNaN(mins) || mins < 0 || mins > 59) return null;
    return mins;
  }

  return parseDurationToMinutes(raw);
}

export function getPresetTimings(
  settings: Settings,
  presetSlot: PresetSlot,
): PhaseTimings | null {
  return settings.presets[presetSlot - 1]?.timings ?? null;
}

/**
 * Quick command: `Lv Ch Last [Preset]`.
 *   - Last = integer 1-4: start at that phase with the preset's full remaining time.
 *   - Last = decimal 1.0-4.999: start at Math.floor(phase) with a partial remaining phase.
 *   - Last = H:MM or plain minutes: "No event" with that much lead time before phase 1.
 *   - Last = ":MM": "No event" with MM minutes before phase 1 (0-59).
 * Preset is optional; defaults to 1. Returns null if any token is invalid.
 */
export function parseQuickCommand(
  command: string,
  settings: Settings,
): ParsedQuickCommand | null {
  const parts = command.trim().split(/\s+/);
  if (parts.length !== 3 && parts.length !== 4) return null;

  const mapLv = Number(parts[0]);
  const ch = Number(parts[1]);
  if (!isValidLvCh(mapLv, ch)) return null;

  const parsedPresetSlot = parsePresetSlot(parts[3]);
  if (parts.length === 4 && parsedPresetSlot === null) return null;
  const presetSlot: PresetSlot = parsedPresetSlot ?? 1;
  const presetTimings = getPresetTimings(settings, presetSlot);
  if (!presetTimings) return null;

  const last = parts[2];
  const numericLast = Number(last);
  if (!Number.isNaN(numericLast)) {
    if (Number.isInteger(numericLast) && numericLast >= 1 && numericLast <= 4) {
      return {
        mapLv,
        ch,
        phase: String(numericLast) as Tracker["phase"],
        noEventMinutes: 0,
        presetSlot,
      };
    }

    if (numericLast >= 1 && numericLast < 5) {
      const phaseFloor = Math.floor(numericLast);
      const fractional = numericLast - phaseFloor;
      const totalOverride = calculateDecimalPhaseRemainingMinutes(
        phaseFloor as 1 | 2 | 3 | 4,
        fractional,
        presetTimings,
      );
      return {
        mapLv,
        ch,
        phase: String(phaseFloor) as Tracker["phase"],
        noEventMinutes: 0,
        presetSlot,
        totalMinutesOverride: totalOverride,
      };
    }
    return null;
  }

  if (/^:\d{1,2}$/.test(last)) {
    const minuteOnly = Number(last.slice(1));
    if (Number.isNaN(minuteOnly) || minuteOnly < 0 || minuteOnly > 59) return null;
    return { mapLv, ch, phase: "No event", noEventMinutes: minuteOnly, presetSlot };
  }

  const parsedDuration = parseDurationToMinutes(last);
  if (parsedDuration !== null) {
    return { mapLv, ch, phase: "No event", noEventMinutes: parsedDuration, presetSlot };
  }

  return null;
}

/**
 * Custom command: `Lv Ch Duration [Preset]`.
 * Duration uses parseFlexibleDuration. Preset is optional; omitted preset means
 * the tracker has no phase context (shown as N/A in the UI).
 */
export function parseCustomCountdownCommand(
  command: string,
): ParsedCustomCommand | null {
  const parts = command.trim().split(/\s+/);
  if (parts.length !== 3 && parts.length !== 4) return null;

  const mapLv = Number(parts[0]);
  const ch = Number(parts[1]);
  if (!isValidLvCh(mapLv, ch)) return null;

  const countdownMinutes = parseFlexibleDuration(parts[2]);
  if (countdownMinutes === null) return null;

  const presetSlot = parsePresetSlot(parts[3]);
  if (parts.length === 4 && presetSlot === null) return null;

  return { mapLv, ch, countdownMinutes, presetSlot };
}

/**
 * Given a starting phase and how far into that phase (fractional 0..1 from the
 * start of the phase), compute the total remaining minutes until "On" using the
 * preset timings.
 */
export function calculateDecimalPhaseRemainingMinutes(
  phaseFloor: 1 | 2 | 3 | 4,
  fractional: number,
  timings: PhaseTimings,
): number {
  const phaseDurations: Record<1 | 2 | 3 | 4, number> = {
    1: timings.p12,
    2: timings.p23,
    3: timings.p34,
    4: timings.p4on,
  };

  const clampedFractional = Math.min(1, Math.max(0, fractional));
  let total = phaseDurations[phaseFloor] * (1 - clampedFractional);

  for (let nextPhase = (phaseFloor + 1) as 2 | 3 | 4 | 5; nextPhase <= 4; nextPhase += 1) {
    total += phaseDurations[nextPhase as 1 | 2 | 3 | 4];
  }

  return Math.max(0, total);
}
