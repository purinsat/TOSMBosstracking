"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getMapBadgeClass } from "@/lib/mapBadge";
import type { RowFilters } from "@/lib/rows";

type Props = {
  filters: RowFilters;
  availableMapLvs: number[];
  grouped: boolean;
  onFiltersChange: (next: RowFilters) => void;
  onToggleGrouped: () => void;
};

export function FiltersBar({
  filters,
  availableMapLvs,
  grouped,
  onFiltersChange,
  onToggleGrouped,
}: Props) {
  const { t } = useLocale();
  const hasMapFilter = availableMapLvs.length > 1;
  const anyFilterActive =
    filters.mapLv !== "all" || filters.presetSlot !== "all";

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t("filter.label")}
        </span>

        {hasMapFilter && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip
              label={t("filter.allLv")}
              selected={filters.mapLv === "all"}
              onClick={() => onFiltersChange({ ...filters, mapLv: "all" })}
            />
            {availableMapLvs.map((lv) => (
              <Chip
                key={lv}
                label={`Lv.${lv}`}
                selected={filters.mapLv === lv}
                accent={getMapBadgeClass(lv)}
                onClick={() => onFiltersChange({ ...filters, mapLv: lv })}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Chip
            label={t("filter.allPresets")}
            selected={filters.presetSlot === "all"}
            onClick={() => onFiltersChange({ ...filters, presetSlot: "all" })}
          />
          {[1, 2, 3].map((slot) => (
            <Chip
              key={slot}
              label={`P${slot}`}
              selected={filters.presetSlot === slot}
              onClick={() =>
                onFiltersChange({ ...filters, presetSlot: slot as 1 | 2 | 3 })
              }
            />
          ))}
        </div>

        <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-sky-400">
          <input
            type="checkbox"
            checked={grouped}
            onChange={onToggleGrouped}
            className="h-3.5 w-3.5 accent-sky-400"
          />
          {t("filter.groupByMap")}
        </label>
      </div>

      {anyFilterActive && (
        <button
          type="button"
          onClick={() => onFiltersChange({ mapLv: "all", presetSlot: "all" })}
          className="self-start text-xs font-semibold text-sky-300 underline underline-offset-2 hover:text-sky-200"
        >
          {t("action.clearFilters")}
        </button>
      )}
    </div>
  );
}

function Chip({
  label,
  selected,
  accent,
  onClick,
}: {
  label: string;
  selected: boolean;
  accent?: string;
  onClick: () => void;
}) {
  const base =
    "rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:border-sky-400";
  if (selected) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} border-sky-500 bg-sky-950/60 text-sky-200`}
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} border-slate-700 bg-slate-950 text-slate-300 ${accent ?? ""}`}
    >
      {label}
    </button>
  );
}
