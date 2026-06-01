import { describe, it, expect } from "vitest";

import {
  parseEpisodeQuery,
  episodeMapLvSet,
  RED_CARD_LV_SET,
  EPISODE_MAP_LVS,
} from "@/lib/episodes";

describe("parseEpisodeQuery", () => {
  it("returns [] for empty input", () => {
    expect(parseEpisodeQuery("")).toEqual([]);
    expect(parseEpisodeQuery("   ")).toEqual([]);
  });

  it("parses a single episode", () => {
    expect(parseEpisodeQuery("1")).toEqual([1]);
    expect(parseEpisodeQuery("16")).toEqual([16]);
  });

  it("parses a comma-separated list", () => {
    expect(parseEpisodeQuery("1,3")).toEqual([1, 3]);
    expect(parseEpisodeQuery("1,3,5")).toEqual([1, 3, 5]);
  });

  it("parses a range", () => {
    expect(parseEpisodeQuery("1-3")).toEqual([1, 2, 3]);
    expect(parseEpisodeQuery("10-12")).toEqual([10, 11, 12]);
  });

  it("parses a reversed range", () => {
    expect(parseEpisodeQuery("3-1")).toEqual([1, 2, 3]);
  });

  it("parses combined ranges and singles", () => {
    expect(parseEpisodeQuery("1-3,5")).toEqual([1, 2, 3, 5]);
    expect(parseEpisodeQuery("1,3-5")).toEqual([1, 3, 4, 5]);
  });

  it("deduplicates overlapping episodes", () => {
    expect(parseEpisodeQuery("1-3,2")).toEqual([1, 2, 3]);
  });

  it("ignores out-of-range values", () => {
    expect(parseEpisodeQuery("0")).toEqual([]);
    expect(parseEpisodeQuery("17")).toEqual([]);
    expect(parseEpisodeQuery("0-2")).toEqual([1, 2]);
  });

  it("returns results sorted ascending", () => {
    expect(parseEpisodeQuery("5,2,8")).toEqual([2, 5, 8]);
  });
});

describe("episodeMapLvSet", () => {
  it("returns empty set for no episodes", () => {
    expect(episodeMapLvSet([])).toEqual(new Set());
  });

  it("returns correct maps for EP1", () => {
    const result = episodeMapLvSet([1]);
    expect(result).toEqual(new Set(EPISODE_MAP_LVS[1]));
  });

  it("EP10 contains map Lv 83 (red card map)", () => {
    const result = episodeMapLvSet([10]);
    expect(result.has(83)).toBe(true);
  });

  it("unions maps across multiple episodes", () => {
    const result = episodeMapLvSet([10, 11]);
    for (const lv of [...EPISODE_MAP_LVS[10], ...EPISODE_MAP_LVS[11]]) {
      expect(result.has(lv)).toBe(true);
    }
  });

  it("does not include maps from unselected episodes", () => {
    const result = episodeMapLvSet([10]);
    expect(result.has(85)).toBe(false); // EP11
  });
});

describe("RED_CARD_LV_SET", () => {
  it("contains all expected red card map levels", () => {
    for (const lv of [83, 89, 93, 103, 113, 123, 133]) {
      expect(RED_CARD_LV_SET.has(lv)).toBe(true);
    }
  });

  it("does not contain non-red-card maps", () => {
    expect(RED_CARD_LV_SET.has(72)).toBe(false);
    expect(RED_CARD_LV_SET.has(80)).toBe(false);
  });
});
