const MAP_BADGE_PALETTE = [
  "border-cyan-400 text-cyan-200",
  "border-emerald-400 text-emerald-200",
  "border-violet-400 text-violet-200",
  "border-amber-400 text-amber-200",
  "border-pink-400 text-pink-200",
  "border-orange-400 text-orange-200",
] as const;

export function getMapBadgeClass(mapLv: number): string {
  return MAP_BADGE_PALETTE[Math.abs(mapLv) % MAP_BADGE_PALETTE.length];
}
