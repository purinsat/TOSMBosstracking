import { describe, it, expect } from "vitest";

import {
  calculateDecimalPhaseRemainingMinutes,
  isValidLvCh,
  parseCustomCountdownCommand,
  parseFlexibleDuration,
  parseManualPhaseCommand,
  parsePresetSlot,
  parseQuickCommand,
} from "@/lib/commands";
import { DEFAULT_SETTINGS } from "@/lib/countdown";
import type { Settings } from "@/lib/types";

function settingsWithPreset2(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    presets: [
      DEFAULT_SETTINGS.presets[0],
      { name: "Preset 2", timings: { p12: 20, p23: 15, p34: 10, p4on: 5 } },
      DEFAULT_SETTINGS.presets[2],
    ],
  };
}

describe("isValidLvCh", () => {
  it("accepts boundary values", () => {
    expect(isValidLvCh(10, 1)).toBe(true);
    expect(isValidLvCh(190, 30)).toBe(true);
    expect(isValidLvCh(103, 12)).toBe(true);
  });

  it("rejects out-of-range values", () => {
    expect(isValidLvCh(9, 12)).toBe(false);
    expect(isValidLvCh(191, 12)).toBe(false);
    expect(isValidLvCh(103, 0)).toBe(false);
    expect(isValidLvCh(103, 31)).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(isValidLvCh(103.5, 12)).toBe(false);
    expect(isValidLvCh(103, 12.1)).toBe(false);
    expect(isValidLvCh(Number.NaN, 12)).toBe(false);
  });
});

describe("parsePresetSlot", () => {
  it("returns the slot for 1, 2, 3", () => {
    expect(parsePresetSlot("1")).toBe(1);
    expect(parsePresetSlot("2")).toBe(2);
    expect(parsePresetSlot("3")).toBe(3);
  });

  it("returns null for anything else", () => {
    expect(parsePresetSlot(undefined)).toBeNull();
    expect(parsePresetSlot("")).toBeNull();
    expect(parsePresetSlot("0")).toBeNull();
    expect(parsePresetSlot("4")).toBeNull();
    expect(parsePresetSlot("abc")).toBeNull();
  });
});

describe("parseFlexibleDuration", () => {
  it("parses whole minutes", () => {
    expect(parseFlexibleDuration("30")).toBe(30);
    expect(parseFlexibleDuration(" 7 ")).toBe(7);
  });

  it("parses H:MM", () => {
    expect(parseFlexibleDuration("2:12")).toBe(2 * 60 + 12);
    expect(parseFlexibleDuration("0:05")).toBe(5);
  });

  it("parses :MM form", () => {
    expect(parseFlexibleDuration(":30")).toBe(30);
    expect(parseFlexibleDuration(":5")).toBe(5);
    expect(parseFlexibleDuration(":0")).toBe(0);
    expect(parseFlexibleDuration(":59")).toBe(59);
  });

  it("rejects invalid shapes", () => {
    expect(parseFlexibleDuration("")).toBeNull();
    expect(parseFlexibleDuration("   ")).toBeNull();
    expect(parseFlexibleDuration(":60")).toBeNull();
    expect(parseFlexibleDuration(":99")).toBeNull();
    expect(parseFlexibleDuration("2:99")).toBeNull();
    expect(parseFlexibleDuration("abc")).toBeNull();
    expect(parseFlexibleDuration("1:2:3")).toBeNull();
  });
});

describe("parseQuickCommand", () => {
  const settings = settingsWithPreset2();

  it("parses integer phase 1-4 with default preset 1", () => {
    const result = parseQuickCommand("103 12 3", settings);
    expect(result).toEqual({
      mapLv: 103,
      ch: 12,
      phase: "3",
      noEventMinutes: 0,
      presetSlot: 1,
    });
  });

  it("parses integer phase with explicit preset slot", () => {
    const result = parseQuickCommand("103 12 2 2", settings);
    expect(result).toEqual({
      mapLv: 103,
      ch: 12,
      phase: "2",
      noEventMinutes: 0,
      presetSlot: 2,
    });
  });

  it("parses decimal phase and returns a totalMinutesOverride", () => {
    const result = parseQuickCommand("103 12 2.5 1", settings);
    // Preset 1: p23=11, p34=7, p4on=3. Half of phase 2 remaining: 5.5 + 7 + 3 = 15.5
    expect(result).toMatchObject({
      mapLv: 103,
      ch: 12,
      phase: "2",
      presetSlot: 1,
      totalMinutesOverride: 15.5,
    });
  });

  it("parses H:MM as a No event lead-in", () => {
    const result = parseQuickCommand("103 13 04:32", settings);
    expect(result).toEqual({
      mapLv: 103,
      ch: 13,
      phase: "No event",
      noEventMinutes: 4 * 60 + 32,
      presetSlot: 1,
    });
  });

  it("parses :MM as a No event lead-in", () => {
    expect(parseQuickCommand("103 13 :5 1", settings)).toEqual({
      mapLv: 103,
      ch: 13,
      phase: "No event",
      noEventMinutes: 5,
      presetSlot: 1,
    });
  });

  it("parses :MM with an explicit populated preset slot", () => {
    expect(parseQuickCommand("103 13 :5 2", settings)).toEqual({
      mapLv: 103,
      ch: 13,
      phase: "No event",
      noEventMinutes: 5,
      presetSlot: 2,
    });
  });

  it("rejects a preset that has no timings set", () => {
    // DEFAULT_SETTINGS.presets[2] has timings === null
    expect(parseQuickCommand("103 12 3 3", settings)).toBeNull();
  });

  it("rejects bad map/ch values", () => {
    expect(parseQuickCommand("9 12 3", settings)).toBeNull();
    expect(parseQuickCommand("103 31 3", settings)).toBeNull();
    expect(parseQuickCommand("103 0 3", settings)).toBeNull();
  });

  it("rejects invalid last token", () => {
    expect(parseQuickCommand("103 12 5", settings)).toBeNull();
    expect(parseQuickCommand("103 12 0", settings)).toBeNull();
    expect(parseQuickCommand("103 12 :60", settings)).toBeNull();
    expect(parseQuickCommand("103 12 abc", settings)).toBeNull();
  });

  it("rejects invalid preset slot token", () => {
    expect(parseQuickCommand("103 12 3 4", settings)).toBeNull();
    expect(parseQuickCommand("103 12 3 abc", settings)).toBeNull();
  });

  it("rejects wrong number of tokens", () => {
    expect(parseQuickCommand("103 12", settings)).toBeNull();
    expect(parseQuickCommand("103 12 3 1 extra", settings)).toBeNull();
    expect(parseQuickCommand("", settings)).toBeNull();
  });
});

describe("parseCustomCountdownCommand", () => {
  it("parses Lv Ch Duration with no preset", () => {
    expect(parseCustomCountdownCommand("103 12 5")).toEqual({
      mapLv: 103,
      ch: 12,
      countdownMinutes: 5,
      presetSlot: null,
    });
  });

  it("parses Lv Ch H:MM", () => {
    expect(parseCustomCountdownCommand("103 12 2:12")).toEqual({
      mapLv: 103,
      ch: 12,
      countdownMinutes: 2 * 60 + 12,
      presetSlot: null,
    });
  });

  it("parses :MM", () => {
    expect(parseCustomCountdownCommand("103 12 :30")).toEqual({
      mapLv: 103,
      ch: 12,
      countdownMinutes: 30,
      presetSlot: null,
    });
  });

  it("parses with a preset slot", () => {
    expect(parseCustomCountdownCommand("103 12 :30 2")).toEqual({
      mapLv: 103,
      ch: 12,
      countdownMinutes: 30,
      presetSlot: 2,
    });
  });

  it("rejects invalid preset slot", () => {
    expect(parseCustomCountdownCommand("103 12 :30 4")).toBeNull();
    expect(parseCustomCountdownCommand("103 12 :30 abc")).toBeNull();
  });

  it("rejects bad map/ch", () => {
    expect(parseCustomCountdownCommand("9 12 :30")).toBeNull();
    expect(parseCustomCountdownCommand("103 0 :30")).toBeNull();
  });

  it("rejects bad duration", () => {
    expect(parseCustomCountdownCommand("103 12 abc")).toBeNull();
    expect(parseCustomCountdownCommand("103 12 :99")).toBeNull();
  });

  it("rejects wrong token count", () => {
    expect(parseCustomCountdownCommand("103 12")).toBeNull();
    expect(parseCustomCountdownCommand("103 12 :30 2 extra")).toBeNull();
  });
});

describe("parseManualPhaseCommand", () => {
  it("parses pure integer phase 1-4", () => {
    expect(parseManualPhaseCommand("72 1 1")).toEqual({ mapLv: 72, ch: 1, phaseDecimal: 1, countdownMinutes: null });
    expect(parseManualPhaseCommand("72 1 4")).toEqual({ mapLv: 72, ch: 1, phaseDecimal: 4, countdownMinutes: null });
  });

  it("parses decimal phase 1.1-4.9", () => {
    expect(parseManualPhaseCommand("72 1 2.5")).toEqual({ mapLv: 72, ch: 1, phaseDecimal: 2.5, countdownMinutes: null });
    expect(parseManualPhaseCommand("72 1 1.0")).toEqual({ mapLv: 72, ch: 1, phaseDecimal: 1.0, countdownMinutes: null });
    expect(parseManualPhaseCommand("72 1 4.9")).toEqual({ mapLv: 72, ch: 1, phaseDecimal: 4.9, countdownMinutes: null });
  });

  it("parses :MM countdown", () => {
    expect(parseManualPhaseCommand("72 1 :20")).toEqual({ mapLv: 72, ch: 1, countdownMinutes: 20, phaseDecimal: null });
    expect(parseManualPhaseCommand("72 1 :0")).toEqual({ mapLv: 72, ch: 1, countdownMinutes: 0, phaseDecimal: null });
    expect(parseManualPhaseCommand("72 1 :59")).toEqual({ mapLv: 72, ch: 1, countdownMinutes: 59, phaseDecimal: null });
  });

  it("parses H:MM countdown", () => {
    expect(parseManualPhaseCommand("72 1 2:00")).toEqual({ mapLv: 72, ch: 1, countdownMinutes: 120, phaseDecimal: null });
    expect(parseManualPhaseCommand("72 1 1:30")).toEqual({ mapLv: 72, ch: 1, countdownMinutes: 90, phaseDecimal: null });
  });

  it("parses multi-digit plain minutes", () => {
    expect(parseManualPhaseCommand("72 1 30")).toEqual({ mapLv: 72, ch: 1, countdownMinutes: 30, phaseDecimal: null });
    expect(parseManualPhaseCommand("72 1 120")).toEqual({ mapLv: 72, ch: 1, countdownMinutes: 120, phaseDecimal: null });
  });

  it("rejects invalid phase values", () => {
    expect(parseManualPhaseCommand("72 1 0")).toBeNull();
    expect(parseManualPhaseCommand("72 1 5")).toBeNull();
    expect(parseManualPhaseCommand("72 1 0.5")).toBeNull();
    expect(parseManualPhaseCommand("72 1 4.95")).toBeNull();
  });

  it("rejects :60 and above", () => {
    expect(parseManualPhaseCommand("72 1 :60")).toBeNull();
    expect(parseManualPhaseCommand("72 1 :99")).toBeNull();
  });

  it("rejects garbage tokens", () => {
    expect(parseManualPhaseCommand("72 1 abc")).toBeNull();
    expect(parseManualPhaseCommand("72 1 ")).toBeNull();
    expect(parseManualPhaseCommand("garbage")).toBeNull();
  });

  it("rejects wrong number of tokens", () => {
    expect(parseManualPhaseCommand("72 1")).toBeNull();
    expect(parseManualPhaseCommand("72 1 2 extra")).toBeNull();
  });

  it("rejects invalid lv/ch", () => {
    expect(parseManualPhaseCommand("9 1 2")).toBeNull();
    expect(parseManualPhaseCommand("72 0 2")).toBeNull();
    expect(parseManualPhaseCommand("72 31 2")).toBeNull();
  });
});

describe("calculateDecimalPhaseRemainingMinutes", () => {
  const timings = { p12: 15, p23: 11, p34: 7, p4on: 3 };

  it("returns full remaining time at the start of a phase (fractional 0)", () => {
    // Phase 1 just started: 15 + 11 + 7 + 3 = 36
    expect(calculateDecimalPhaseRemainingMinutes(1, 0, timings)).toBe(36);
    // Phase 4 just started: 3
    expect(calculateDecimalPhaseRemainingMinutes(4, 0, timings)).toBe(3);
  });

  it("returns only the later phases when current phase is done (fractional 1)", () => {
    // Phase 1 fully done -> 11 + 7 + 3 = 21
    expect(calculateDecimalPhaseRemainingMinutes(1, 1, timings)).toBe(21);
    // Phase 4 fully done -> 0
    expect(calculateDecimalPhaseRemainingMinutes(4, 1, timings)).toBe(0);
  });

  it("handles 50% partial", () => {
    // Phase 2 half done: 11*0.5 + 7 + 3 = 15.5
    expect(calculateDecimalPhaseRemainingMinutes(2, 0.5, timings)).toBe(15.5);
  });

  it("clamps negative and >1 fractionals", () => {
    expect(calculateDecimalPhaseRemainingMinutes(1, -0.5, timings)).toBe(36);
    expect(calculateDecimalPhaseRemainingMinutes(1, 1.5, timings)).toBe(21);
  });
});
