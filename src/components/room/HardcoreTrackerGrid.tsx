"use client";

import { HardcoreTrackerTile } from "@/components/room/HardcoreTrackerTile";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { HardcoreSortMode, ManualPhaseRow } from "@/lib/rows";

type Props = {
  rows: ManualPhaseRow[];
  sortMode: HardcoreSortMode;
  onSortMode: (mode: HardcoreSortMode) => void;
  onRemove: (id: string) => void;
  onCycleWhole: (id: string) => void;
  onBumpDecimal: (id: string) => void;
  onResetTime: (id: string) => void;
};

export function HardcoreTrackerGrid({
  rows,
  sortMode,
  onSortMode,
  onRemove,
  onCycleWhole,
  onBumpDecimal,
  onResetTime,
}: Props) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-2">
      {/* Sort toggle */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-500">{t("hardcore.sortBy")}</span>
        <div className="flex rounded-full border border-slate-700 bg-slate-900 p-0.5">
          {(["time", "phase"] as HardcoreSortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSortMode(mode)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                sortMode === mode
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t(`hardcore.sort.${mode}`)}
            </button>
          ))}
        </div>
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
