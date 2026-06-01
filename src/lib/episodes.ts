export const EPISODE_MAP_LVS: Record<number, number[]> = {
  1:  [1, 3, 5, 7, 9],
  2:  [10, 11, 12, 13, 15, 17, 19],
  3:  [20, 21, 22, 24, 26, 28],
  4:  [30, 31, 32, 34, 36, 38],
  5:  [40, 42, 44, 46, 48],
  6:  [50, 51, 52, 53, 55, 57, 59],
  7:  [60, 61, 62, 64, 66, 68],
  8:  [70, 71, 72, 73, 74],
  9:  [75, 76, 77, 78, 79],
  10: [80, 81, 82, 83],
  11: [85, 86, 87, 88, 89],
  12: [90, 91, 92, 93],
  13: [95, 98, 101, 103],
  14: [105, 107, 109, 111, 113],
  15: [115, 118, 120, 123],
  16: [125, 128, 130, 133],
};

export const RED_CARD_MAP_LVS = [83, 89, 93, 103, 113, 123, 133];
export const RED_CARD_LV_SET = new Set(RED_CARD_MAP_LVS);
export const MAX_EPISODE = 16;

/**
 * Parse episode query strings like "1-3", "1,3", or "1-3,5".
 * Returns sorted unique episode numbers in [1..16].
 * Empty/whitespace input returns [] meaning "no episode filter".
 */
export function parseEpisodeQuery(input: string): number[] {
  if (!input.trim()) return [];
  const result = new Set<number>();
  for (const part of input.split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    const range = seg.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      let a = Number(range[1]);
      let b = Number(range[2]);
      if (a > b) [a, b] = [b, a];
      for (let ep = a; ep <= b; ep++) if (ep >= 1 && ep <= MAX_EPISODE) result.add(ep);
    } else if (/^\d+$/.test(seg)) {
      const ep = Number(seg);
      if (ep >= 1 && ep <= MAX_EPISODE) result.add(ep);
    }
  }
  return [...result].sort((a, b) => a - b);
}

/** Union of all map levels belonging to the given episode numbers. */
export function episodeMapLvSet(episodes: number[]): Set<number> {
  const set = new Set<number>();
  for (const ep of episodes) for (const lv of EPISODE_MAP_LVS[ep] ?? []) set.add(lv);
  return set;
}
