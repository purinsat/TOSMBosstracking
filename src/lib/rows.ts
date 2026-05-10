import { getDynamicPhaseDisplayWithDecimal, getTotalMinutes } from "@/lib/countdown";
import { getPresetTimings } from "@/lib/mappers";
import type { Settings, Tracker } from "@/lib/types";

export type ManualPhaseRow = {
  tracker: Tracker;
  remainingSeconds: number;
  elapsedSeconds: number;
  isCountForward: boolean;
  displayPhase: string;
};

export function formatManualPhaseDisplay(phaseDecimal: number | null): string {
  if (phaseDecimal === null || phaseDecimal === 0) return "No event";
  if (phaseDecimal >= 5.0) return "BOSS ON";
  const whole = Math.floor(phaseDecimal);
  const decimal = Math.round((phaseDecimal - whole) * 10);
  if (decimal === 0) return String(whole);
  return `${whole}.${decimal}`;
}

export type HardcoreSortMode = "time" | "phase";

function phaseDecimalSortKey(phaseDecimal: number | null): number {
  // Higher = shown first. BOSS ON (>=5) → 6, phase 1–4.9 → value, No event (0/null) → -1
  if (phaseDecimal === null || phaseDecimal === 0) return -1;
  if (phaseDecimal >= 5) return 6;
  return phaseDecimal;
}

export function prepareManualPhaseRows(
  trackers: Tracker[],
  nowMs: number,
  sortMode: HardcoreSortMode = "time",
): ManualPhaseRow[] {
  const rows: ManualPhaseRow[] = trackers
    .filter((t) => t.kind === "manual_phase")
    .map((tracker) => {
      const targetMs = new Date(tracker.targetAt).getTime();
      const diff = (targetMs - nowMs) / 1000;
      const remainingSeconds = Math.floor(diff);
      const elapsedSeconds = Math.max(0, Math.floor(-diff));
      const isCountForward = remainingSeconds <= 0;
      const displayPhase = formatManualPhaseDisplay(tracker.phaseDecimal);
      return { tracker, remainingSeconds, elapsedSeconds, isCountForward, displayPhase };
    });

  if (sortMode === "phase") {
    return rows.sort((a, b) => {
      const phaseDiff =
        phaseDecimalSortKey(b.tracker.phaseDecimal) - phaseDecimalSortKey(a.tracker.phaseDecimal);
      if (phaseDiff !== 0) return phaseDiff;
      // Within same phase: count-forward by elapsed DESC, countdown by remaining ASC
      if (a.isCountForward && b.isCountForward) return b.elapsedSeconds - a.elapsedSeconds;
      if (!a.isCountForward && !b.isCountForward) return a.remainingSeconds - b.remainingSeconds;
      return a.isCountForward ? -1 : 1;
    });
  }

  // Default: sort by time — count-forward (elapsed DESC) first, then countdown (remaining ASC)
  const forward = rows.filter((r) => r.isCountForward).sort((a, b) => b.elapsedSeconds - a.elapsedSeconds);
  const countdown = rows.filter((r) => !r.isCountForward).sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  return [...forward, ...countdown];
}

export function applyFrozenOrder(
  rows: ManualPhaseRow[],
  orderIds: string[] | null,
): ManualPhaseRow[] {
  if (!orderIds || orderIds.length === 0) return rows;
  const idIndex = new Map(orderIds.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => {
    const ai = idIndex.get(a.tracker.id);
    const bi = idIndex.get(b.tracker.id);
    // Newly added trackers (not in snapshot) go to the end
    if (ai === undefined && bi === undefined) return 0;
    if (ai === undefined) return 1;
    if (bi === undefined) return -1;
    return ai - bi;
  });
}

export type SortMode = "time" | "channel";

export type RowFilters = {
  mapLv: number | "all";
  presetSlot: 1 | 2 | 3 | "all";
};

export const ALL_FILTERS: RowFilters = { mapLv: "all", presetSlot: "all" };

export type PreparedRow = {
  tracker: Tracker;
  remainingSeconds: number;
  /** Fraction of the total countdown that is still remaining, in [0, 1]. */
  progressRemaining: number;
  displayPhase: string;
};

export function prepareRows(
  trackers: Tracker[],
  settings: Settings,
  nowMs: number,
  sortMode: SortMode,
): PreparedRow[] {
  const rows: PreparedRow[] = trackers.map((tracker) => {
    const targetMs = new Date(tracker.targetAt).getTime();
    const remainingSeconds = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
    const totalSeconds = estimateTotalSeconds(tracker, settings, targetMs);
    const progressRemaining =
      totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;

    const presetTimings = tracker.presetSlot ? getPresetTimings(settings, tracker.presetSlot) : null;
    const displayPhase = presetTimings
      ? getDynamicPhaseDisplayWithDecimal(
          tracker.phase,
          remainingSeconds,
          presetTimings,
          tracker.noEventMinutes,
        )
      : "N/A";

    return { tracker, remainingSeconds, progressRemaining, displayPhase };
  });

  if (sortMode === "channel") {
    return rows.sort((a, b) => {
      if (a.tracker.ch !== b.tracker.ch) return a.tracker.ch - b.tracker.ch;
      return a.remainingSeconds - b.remainingSeconds;
    });
  }

  return rows.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
}

export function filterRows(rows: PreparedRow[], filters: RowFilters): PreparedRow[] {
  return rows.filter((row) => {
    if (filters.mapLv !== "all" && row.tracker.mapLv !== filters.mapLv) return false;
    if (filters.presetSlot !== "all" && row.tracker.presetSlot !== filters.presetSlot) {
      return false;
    }
    return true;
  });
}

export function getDistinctMapLvs(rows: PreparedRow[]): number[] {
  const set = new Set<number>();
  for (const row of rows) set.add(row.tracker.mapLv);
  return [...set].sort((a, b) => a - b);
}

export function groupRowsByMap(rows: PreparedRow[]): Array<{ mapLv: number; rows: PreparedRow[] }> {
  const groups = new Map<number, PreparedRow[]>();
  for (const row of rows) {
    const bucket = groups.get(row.tracker.mapLv) ?? [];
    bucket.push(row);
    groups.set(row.tracker.mapLv, bucket);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([mapLv, groupRows]) => ({ mapLv, rows: groupRows }));
}

/**
 * Estimate the total countdown duration this tracker started with, in seconds.
 * Used only to drive the progress ring; if unknown, the current remaining
 * duration is used so the ring starts full.
 */
function estimateTotalSeconds(tracker: Tracker, settings: Settings, targetMs: number): number {
  const createdMs = new Date(tracker.createdAt).getTime();
  const fromCreated = Math.max(0, Math.floor((targetMs - createdMs) / 1000));
  if (fromCreated > 0) return fromCreated;

  if (!tracker.presetSlot) return fromCreated;
  const timings = getPresetTimings(settings, tracker.presetSlot);
  if (!timings) return fromCreated;
  return getTotalMinutes(tracker.phase, timings, tracker.noEventMinutes) * 60;
}
