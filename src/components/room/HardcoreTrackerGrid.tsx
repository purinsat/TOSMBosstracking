"use client";

import { HardcoreTrackerTile } from "@/components/room/HardcoreTrackerTile";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { HardcoreSortMode, ManualPhaseRow } from "@/lib/rows";

type Props = {
  rows: ManualPhaseRow[];
  lastSort: HardcoreSortMode;
  onSort: (mode: HardcoreSortMode) => void;
  hideCooldown: boolean;
  onToggleHideCooldown: () => void;
  episodeFilter: string;
  onEpisodeFilterChange: (value: string) => void;
  redCardOnly: boolean;
  onToggleRedCard: () => void;
  onRemove: (id: string) => void;
  onCycleWhole: (id: string) => void;
  onBumpDecimal: (id: string) => void;
  onResetTime: (id: string) => void;
};

export function HardcoreTrackerGrid({
  rows,
  lastSort,
  onSort,
  hideCooldown,
  onToggleHideCooldown,
  episodeFilter,
  onEpisodeFilterChange,
  redCardOnly,
  onToggleRedCard,
  onRemove,
  onCycleWhole,
  onBumpDecimal,
  onResetTime,
}: Props) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar: snapshot sort buttons + live Lv sort + hide-cooldown toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSort("time")}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            lastSort === "time"
              ? "border-sky-500 bg-sky-600 text-white"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:text-slate-100"
          }`}
        >
          {t("hardcore.sortByTime")}
        </button>
        <button
          type="button"
          onClick={() => onSort("phase")}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            lastSort === "phase"
              ? "border-sky-500 bg-sky-600 text-white"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:text-slate-100"
          }`}
        >
          {t("hardcore.sortByPhase")}
        </button>
        {/* Lv sort — live; clicking again flips direction */}
        {(() => {
          const lvActive = lastSort === "lv-asc" || lastSort === "lv-desc";
          const nextLvMode: HardcoreSortMode = lastSort === "lv-asc" ? "lv-desc" : "lv-asc";
          const arrow = lastSort === "lv-asc" ? " ↑" : lastSort === "lv-desc" ? " ↓" : "";
          return (
            <button
              type="button"
              onClick={() => onSort(nextLvMode)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                lvActive
                  ? "border-sky-500 bg-sky-600 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:text-slate-100"
              }`}
            >
              {t("hardcore.sortByLv")}{arrow}
            </button>
          );
        })()}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={hideCooldown}
            onChange={onToggleHideCooldown}
            className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900"
          />
          {t("hardcore.hideCooldown")}
        </label>
      </div>

      {/* Filter row: episode input + red-card toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="shrink-0">{t("hardcore.episodeLabel")}</span>
          <input
            type="text"
            value={episodeFilter}
            onChange={(e) => onEpisodeFilterChange(e.target.value)}
            placeholder={t("hardcore.episodePlaceholder")}
            aria-label={t("hardcore.episodeLabel")}
            className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder-slate-600 focus:border-sky-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={redCardOnly}
            onChange={onToggleRedCard}
            className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900"
          />
          {t("hardcore.redCardOnly")}
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-center text-slate-400">
          {t("hardcore.empty")}
        </div>
      ) : (
        <section
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          aria-label={t("tab.hardcore")}
        >
          {rows.map((row) => (
            <HardcoreTrackerTile
              key={row.tracker.id}
              row={row}
              onRemove={onRemove}
              onCycleWhole={onCycleWhole}
              onBumpDecimal={onBumpDecimal}
              onResetTime={onResetTime}
            />
          ))}
        </section>
      )}
    </div>
  );
}
