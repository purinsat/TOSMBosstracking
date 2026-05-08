"use client";

import { useRef } from "react";

import { formatMinutesSeconds } from "@/lib/countdown";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getMapBadgeClass } from "@/lib/mapBadge";
import type { ManualPhaseRow } from "@/lib/rows";

type Props = {
  row: ManualPhaseRow;
  onRemove: (id: string) => void;
  onCycleWhole: (id: string) => void;
  onBumpDecimal: (id: string) => void;
  onResetTime: (id: string) => void;
};

function getTileColorClasses(row: ManualPhaseRow): string {
  if (!row.isCountForward) {
    const remainingMinutes = row.remainingSeconds / 60;
    if (remainingMinutes < 25) return "border-red-500 bg-red-950/30";
    if (remainingMinutes <= 40) return "border-yellow-500 bg-yellow-950/25";
    return "border-green-500 bg-green-950/20";
  }
  const elapsedHours = row.elapsedSeconds / 3600;
  if (elapsedHours >= 4) return "border-rose-500 bg-rose-950/30";
  return "border-amber-500 bg-amber-950/20";
}

function getTimeColorClass(row: ManualPhaseRow): string {
  if (!row.isCountForward) {
    const remainingMinutes = row.remainingSeconds / 60;
    if (remainingMinutes < 25) return "text-red-300";
    if (remainingMinutes <= 40) return "text-yellow-200";
    return "text-sky-100";
  }
  const elapsedHours = row.elapsedSeconds / 3600;
  if (elapsedHours >= 4) return "text-rose-300";
  return "text-amber-200";
}

export function HardcoreTrackerTile({ row, onRemove, onCycleWhole, onBumpDecimal, onResetTime }: Props) {
  const { t } = useLocale();
  const { tracker, isCountForward, elapsedSeconds, remainingSeconds, displayPhase } = row;
  const tileColor = getTileColorClasses(row);
  const timeColor = getTimeColorClass(row);

  const timeLabel = isCountForward
    ? `+${formatMinutesSeconds(elapsedSeconds)}`
    : formatMinutesSeconds(Math.abs(remainingSeconds));

  const isBossOn = displayPhase === "BOSS ON";
  const isNoEvent = displayPhase === "No event";
  const phaseDecimal = tracker.phaseDecimal ?? 0;
  const whole = phaseDecimal === 0 || phaseDecimal >= 5 ? null : Math.floor(phaseDecimal);
  const decimal = whole === null ? null : Math.round((phaseDecimal - whole) * 10);

  // Debounce: prevent rapid repeated phase updates
  const lastClickRef = useRef<Record<string, number>>({});

  function debounce(key: string, fn: () => void, ms = 400) {
    const now = Date.now();
    if ((lastClickRef.current[key] ?? 0) + ms > now) return;
    lastClickRef.current[key] = now;
    fn();
  }

  return (
    <article
      className={`relative flex min-h-[120px] flex-col justify-between rounded-2xl border-2 p-2 ${tileColor}`}
    >
      {/* Top row: Lv badge, Ch badge, remove */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <span
            className={`rounded-full border bg-slate-900 px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-slate-200 ${getMapBadgeClass(tracker.mapLv)}`}
          >
            Lv.{tracker.mapLv}
          </span>
          <span
            className={`rounded-full border bg-slate-900 px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-slate-200 ${getMapBadgeClass(tracker.mapLv)}`}
          >
            Ch.{tracker.ch}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(tracker.id)}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-xs text-slate-400 hover:border-rose-500 hover:text-rose-300"
          aria-label={t("tracker.remove")}
          title={t("tracker.remove")}
        >
          ×
        </button>
      </div>

      {/* Phase row */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-500">Phase :</span>
        {isBossOn ? (
          <button
            type="button"
            onClick={() => debounce("whole", () => onCycleWhole(tracker.id))}
            className="rounded-full border border-yellow-400 bg-yellow-950/50 px-2 py-1 text-sm font-bold text-yellow-200 hover:border-yellow-300 active:scale-95"
            title="Tap to reset to Phase 1"
            aria-label="BOSS ON — tap to reset to Phase 1"
          >
            BOSS ON
          </button>
        ) : isNoEvent ? (
          <span className="rounded-full border border-slate-600 bg-slate-900 px-2 py-1 text-sm font-semibold text-slate-400">
            {displayPhase}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => debounce("whole", () => onCycleWhole(tracker.id))}
              className="flex items-baseline gap-0.5 rounded-full border border-sky-600 bg-slate-900 px-2 py-1 hover:border-sky-400 active:scale-95"
              aria-label={`Phase ${displayPhase}, tap to cycle`}
              title="Tap to cycle phase"
            >
              <span className="text-sm font-bold text-sky-200">{whole}</span>
              {decimal !== null && decimal !== 0 && (
                <span className="text-xs font-semibold text-sky-400">.{decimal}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => debounce("decimal", () => onBumpDecimal(tracker.id))}
              className="rounded-full border border-slate-600 bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:border-sky-400 hover:text-sky-300 active:scale-95"
              aria-label={t("hardcore.bumpDecimal")}
              title="+0.1"
            >
              +.1
            </button>
          </>
        )}
      </div>

      {/* Time */}
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-lg font-bold tabular-nums ${timeColor}`}>
          {timeLabel}
        </span>
        {isCountForward && (
          <button
            type="button"
            onClick={() => debounce("reset", () => onResetTime(tracker.id))}
            className="rounded-full border border-slate-600 bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-sky-400 hover:text-sky-300"
            title="Reset elapsed time"
            aria-label="Reset elapsed time"
          >
            ↺
          </button>
        )}
        {!isCountForward && (
          <span className="text-[10px] text-slate-500">{t("hardcore.countdown")}</span>
        )}
      </div>
    </article>
  );
}
