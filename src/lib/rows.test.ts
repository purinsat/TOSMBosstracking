import { describe, it, expect } from "vitest";

import { formatManualPhaseDisplay, prepareManualPhaseRows } from "@/lib/rows";
import type { Tracker } from "@/lib/types";

function makeTracker(overrides: Partial<Tracker> & { id: string }): Tracker {
  const { id, ...rest } = overrides;
  return {
    id,
    roomId: "room1",
    mapLv: 72,
    ch: 1,
    phase: "No event",
    noEventMinutes: 0,
    presetSlot: null,
    isCustomTime: false,
    targetAt: new Date(Date.now()).toISOString(),
    createdAt: new Date(Date.now()).toISOString(),
    kind: "manual_phase",
    phaseDecimal: null,
    ...rest,
  };
}

describe("formatManualPhaseDisplay", () => {
  it("returns No event for null", () => {
    expect(formatManualPhaseDisplay(null)).toBe("No event");
  });

  it("returns No event for 0", () => {
    expect(formatManualPhaseDisplay(0)).toBe("No event");
  });

  it("returns whole number for integer phases", () => {
    expect(formatManualPhaseDisplay(1.0)).toBe("1");
    expect(formatManualPhaseDisplay(4.0)).toBe("4");
  });

  it("returns N.D for decimal phases", () => {
    expect(formatManualPhaseDisplay(2.5)).toBe("2.5");
    expect(formatManualPhaseDisplay(3.1)).toBe("3.1");
    expect(formatManualPhaseDisplay(4.9)).toBe("4.9");
  });
});

describe("prepareManualPhaseRows", () => {
  const nowMs = Date.now();

  it("sorts count-forward rows first, then countdown rows", () => {
    const forwardTracker = makeTracker({
      id: "fwd",
      targetAt: new Date(nowMs - 10 * 60 * 1000).toISOString(),
      phaseDecimal: 1.0,
    });
    const countdownTracker = makeTracker({
      id: "cnt",
      targetAt: new Date(nowMs + 30 * 60 * 1000).toISOString(),
      phaseDecimal: 0,
    });

    const rows = prepareManualPhaseRows([countdownTracker, forwardTracker], nowMs);
    expect(rows[0].tracker.id).toBe("fwd");
    expect(rows[1].tracker.id).toBe("cnt");
  });

  it("sorts count-forward by elapsed DESC (longest elapsed first)", () => {
    const t1 = makeTracker({ id: "t1", targetAt: new Date(nowMs - 5 * 60 * 1000).toISOString(), phaseDecimal: 1.0 });
    const t2 = makeTracker({ id: "t2", targetAt: new Date(nowMs - 15 * 60 * 1000).toISOString(), phaseDecimal: 2.0 });
    const t3 = makeTracker({ id: "t3", targetAt: new Date(nowMs - 2 * 60 * 1000).toISOString(), phaseDecimal: 3.0 });

    const rows = prepareManualPhaseRows([t1, t2, t3], nowMs);
    expect(rows.map((r) => r.tracker.id)).toEqual(["t2", "t1", "t3"]);
  });

  it("sorts countdown by remaining ASC (most imminent first)", () => {
    const t1 = makeTracker({ id: "t1", targetAt: new Date(nowMs + 60 * 60 * 1000).toISOString(), phaseDecimal: 0 });
    const t2 = makeTracker({ id: "t2", targetAt: new Date(nowMs + 10 * 60 * 1000).toISOString(), phaseDecimal: 0 });
    const t3 = makeTracker({ id: "t3", targetAt: new Date(nowMs + 30 * 60 * 1000).toISOString(), phaseDecimal: 0 });

    const rows = prepareManualPhaseRows([t1, t2, t3], nowMs);
    expect(rows.map((r) => r.tracker.id)).toEqual(["t2", "t3", "t1"]);
  });

  it("ignores preset-kind trackers", () => {
    const presetTracker = makeTracker({ id: "p1", kind: "preset" });
    const rows = prepareManualPhaseRows([presetTracker], nowMs);
    expect(rows).toHaveLength(0);
  });

  it("marks isCountForward correctly", () => {
    const fwd = makeTracker({ id: "fwd", targetAt: new Date(nowMs - 1000).toISOString() });
    const cnt = makeTracker({ id: "cnt", targetAt: new Date(nowMs + 1000).toISOString() });
    const rows = prepareManualPhaseRows([fwd, cnt], nowMs);
    const fwdRow = rows.find((r) => r.tracker.id === "fwd")!;
    const cntRow = rows.find((r) => r.tracker.id === "cnt")!;
    expect(fwdRow.isCountForward).toBe(true);
    expect(cntRow.isCountForward).toBe(false);
  });
});
