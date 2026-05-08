import { describe, it, expect } from "vitest";

import {
  DEFAULT_SETTINGS,
  formatDurationInput,
  formatHoursMinutes,
  formatMinutesSeconds,
  getBaseCycleMinutes,
  getColorClasses,
  getDynamicPhaseDisplay,
  getDynamicPhaseDisplayWithDecimal,
  getTotalMinutes,
  parseDurationToMinutes,
} from "@/lib/countdown";
import type { PhaseTimings } from "@/lib/types";

const timings: PhaseTimings = { p12: 15, p23: 11, p34: 7, p4on: 3 };

describe("getBaseCycleMinutes", () => {
  it("sums all four phase durations", () => {
    expect(getBaseCycleMinutes(timings)).toBe(36);
  });
});

describe("getTotalMinutes", () => {
  it("returns the right sum for each phase", () => {
    expect(getTotalMinutes("1", timings, 0)).toBe(36);
    expect(getTotalMinutes("2", timings, 0)).toBe(11 + 7 + 3);
    expect(getTotalMinutes("3", timings, 0)).toBe(7 + 3);
    expect(getTotalMinutes("4", timings, 0)).toBe(3);
  });

  it("adds noEventMinutes to the base cycle for No event", () => {
    expect(getTotalMinutes("No event", timings, 5)).toBe(5 + 36);
    expect(getTotalMinutes("No event", timings, 0)).toBe(36);
  });
});

describe("parseDurationToMinutes", () => {
  it("parses whole minutes", () => {
    expect(parseDurationToMinutes("30")).toBe(30);
    expect(parseDurationToMinutes("0")).toBe(0);
  });

  it("parses H:MM", () => {
    expect(parseDurationToMinutes("2:12")).toBe(132);
    expect(parseDurationToMinutes("00:05")).toBe(5);
  });

  it("rejects invalid input", () => {
    expect(parseDurationToMinutes("abc")).toBeNull();
    expect(parseDurationToMinutes("1:99")).toBeNull();
    expect(parseDurationToMinutes(":30")).toBeNull();
  });
});

describe("formatDurationInput", () => {
  it("normalizes plain minutes to HH:MM", () => {
    expect(formatDurationInput("5")).toBe("00:05");
    expect(formatDurationInput("65")).toBe("01:05");
  });

  it("pads H:MM forms", () => {
    expect(formatDurationInput("1:5")).toBe("01:05");
  });

  it("returns null on bad input", () => {
    expect(formatDurationInput("abc")).toBeNull();
    expect(formatDurationInput("1:99")).toBeNull();
  });
});

describe("formatMinutesSeconds", () => {
  it("formats M:SS", () => {
    expect(formatMinutesSeconds(0)).toBe("0:00");
    expect(formatMinutesSeconds(5)).toBe("0:05");
    expect(formatMinutesSeconds(65)).toBe("1:05");
    expect(formatMinutesSeconds(3600)).toBe("60:00");
  });
});

describe("getColorClasses", () => {
  it("picks red under 25 min", () => {
    expect(getColorClasses(0)).toContain("red");
    expect(getColorClasses(24)).toContain("red");
  });

  it("picks yellow from 25 to 40 min inclusive", () => {
    expect(getColorClasses(25)).toContain("yellow");
    expect(getColorClasses(40)).toContain("yellow");
  });

  it("picks green above 40 min", () => {
    expect(getColorClasses(41)).toContain("green");
    expect(getColorClasses(999)).toContain("green");
  });
});

describe("getDynamicPhaseDisplay", () => {
  // Given timings 15/11/7/3, boundaries (in minutes remaining) from phase 1 start:
  //   p4Start = 3, p3Start = 10, p2Start = 21, full cycle = 36
  it("No event stays No event while above cycle", () => {
    expect(getDynamicPhaseDisplay("No event", 40 * 60, timings, 4)).toBe("No event");
  });

  it("No event transitions into 1 once remaining <= cycle", () => {
    expect(getDynamicPhaseDisplay("No event", 36 * 60, timings, 4)).toBe("1");
    expect(getDynamicPhaseDisplay("No event", 25 * 60, timings, 4)).toBe("1");
  });

  it("phase 1 transitions through 2, 3, 4 at the right boundaries", () => {
    expect(getDynamicPhaseDisplay("1", 22 * 60, timings, 0)).toBe("1");
    expect(getDynamicPhaseDisplay("1", 20 * 60, timings, 0)).toBe("2");
    expect(getDynamicPhaseDisplay("1", 9 * 60, timings, 0)).toBe("3");
    expect(getDynamicPhaseDisplay("1", 2 * 60, timings, 0)).toBe("4");
  });

  it("returns On when remaining <= 0", () => {
    expect(getDynamicPhaseDisplay("1", 0, timings, 0)).toBe("On");
    expect(getDynamicPhaseDisplay("3", -10, timings, 0)).toBe("On");
  });
});

describe("getDynamicPhaseDisplayWithDecimal", () => {
  it("appends .0 at the start of a phase", () => {
    // Phase 1 just started: 36 min remain
    expect(getDynamicPhaseDisplayWithDecimal("1", 36 * 60, timings, 0)).toBe("1.0");
  });

  it("appends a growing decimal as the phase progresses", () => {
    // Phase 1 half done = 7.5 min into phase 1 -> 28.5 min remain total
    expect(getDynamicPhaseDisplayWithDecimal("1", 28.5 * 60, timings, 0)).toBe("1.5");
  });

  it("passes through No event and On unchanged", () => {
    expect(getDynamicPhaseDisplayWithDecimal("No event", 50 * 60, timings, 5)).toBe("No event");
    expect(getDynamicPhaseDisplayWithDecimal("1", 0, timings, 0)).toBe("On");
  });

  it("clamps decimal to 0-9", () => {
    const value = getDynamicPhaseDisplayWithDecimal("4", 1, timings, 0);
    // Phase 4 almost over -> base is "4", decimal should be 9
    expect(value).toBe("4.9");
  });

  it("handles zero-duration phases without crashing", () => {
    const zero: PhaseTimings = { p12: 0, p23: 0, p34: 0, p4on: 5 };
    expect(getDynamicPhaseDisplayWithDecimal("4", 5 * 60, zero, 0)).toBe("4.0");
  });
});

describe("formatHoursMinutes", () => {
  it("formats 0 seconds as 00:00", () => {
    expect(formatHoursMinutes(0)).toBe("00:00");
  });

  it("formats exactly 59 seconds as 00:00 (floor to minutes)", () => {
    expect(formatHoursMinutes(59)).toBe("00:00");
  });

  it("formats 60 seconds as 00:01", () => {
    expect(formatHoursMinutes(60)).toBe("00:01");
  });

  it("formats 3600 seconds as 01:00", () => {
    expect(formatHoursMinutes(3600)).toBe("01:00");
  });

  it("formats 5 * 3600 seconds as 05:00", () => {
    expect(formatHoursMinutes(5 * 3600)).toBe("05:00");
  });

  it("formats 2h30m as 02:30", () => {
    expect(formatHoursMinutes(2 * 3600 + 30 * 60)).toBe("02:30");
  });

  it("clamps negative values to 00:00", () => {
    expect(formatHoursMinutes(-1)).toBe("00:00");
    expect(formatHoursMinutes(-3600)).toBe("00:00");
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("has preset 1 populated and 2/3 blank", () => {
    expect(DEFAULT_SETTINGS.presets[0].timings).not.toBeNull();
    expect(DEFAULT_SETTINGS.presets[1].timings).toBeNull();
    expect(DEFAULT_SETTINGS.presets[2].timings).toBeNull();
  });
});
