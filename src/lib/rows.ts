import { getDynamicPhaseDisplayWithDecimal, getTotalMinutes } from "@/lib/countdown";
import { getPresetTimings } from "@/lib/mappers";
import type { Settings, Tracker } from "@/lib/types";

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
