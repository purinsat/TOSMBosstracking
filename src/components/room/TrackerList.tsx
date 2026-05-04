"use client";

import { TrackerRow } from "@/components/room/TrackerRow";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getMapBadgeClass } from "@/lib/mapBadge";
import { groupRowsByMap, type PreparedRow } from "@/lib/rows";

type Props = {
  rows: PreparedRow[];
  flashedIds: Set<string>;
  grouped?: boolean;
  onRemove: (id: string) => void;
  onSetTime: (id: string) => void;
};

export function TrackerList({
  rows,
  flashedIds,
  grouped = false,
  onRemove,
  onSetTime,
}: Props) {
  const { t } = useLocale();
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-center text-slate-400">
        {t("tracker.emptyFiltered")}
      </div>
    );
  }

  if (grouped) {
    const groups = groupRowsByMap(rows);
    return (
      <section className="flex flex-col gap-3">
        {groups.map(({ mapLv, rows: groupRows }) => {
          const hasFlash = groupRows.some((row) => flashedIds.has(row.tracker.id));
          return (
            <details
              key={mapLv}
              open
              className="group rounded-2xl border border-slate-800 bg-slate-900/40"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900/80">
                <span
                  aria-hidden
                  className="inline-block transition-transform group-open:rotate-90"
                >
                  ▸
                </span>
                <span
                  className={`rounded-full border bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getMapBadgeClass(
                    mapLv,
                  )}`}
                >
                  Lv.{mapLv}
                </span>
                <span className="text-slate-400">
                  {groupRows.length}{" "}
                  {groupRows.length === 1 ? t("tracker.tracker") : t("tracker.trackers")}
                </span>
                {hasFlash && (
                  <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-900">
                    {t("tracker.new")}
                  </span>
                )}
              </summary>
              <div className="flex flex-col gap-3 px-3 pb-3">
                {groupRows.map((row) => (
                  <TrackerRow
                    key={row.tracker.id}
                    row={row}
                    isFlashing={flashedIds.has(row.tracker.id)}
                    onRemove={onRemove}
                    onSetTime={onSetTime}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {rows.map((row) => (
        <TrackerRow
          key={row.tracker.id}
          row={row}
          isFlashing={flashedIds.has(row.tracker.id)}
          onRemove={onRemove}
          onSetTime={onSetTime}
        />
      ))}
    </section>
  );
}
