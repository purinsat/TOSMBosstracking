"use client";

import { formatMinutesSeconds, getColorClasses } from "@/lib/countdown";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getMapBadgeClass } from "@/lib/mapBadge";
import type { PreparedRow } from "@/lib/rows";

type Props = {
  row: PreparedRow;
  isFlashing: boolean;
  onRemove: (id: string) => void;
  onSetTime: (id: string) => void;
};

export function TrackerRow({ row, isFlashing, onRemove, onSetTime }: Props) {
  const { t } = useLocale();
  const { tracker, remainingSeconds, progressRemaining, displayPhase } = row;
  const containerTone = getColorClasses(Math.ceil(remainingSeconds / 60));
  const countdownText = formatMinutesSeconds(remainingSeconds);
  const ringPercent = Math.round(progressRemaining * 100);

  return (
    <article
      data-flashing={isFlashing ? "true" : undefined}
      className={`relative flex flex-wrap items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors sm:rounded-full sm:px-5 sm:py-4 ${containerTone} ${
        isFlashing ? "tracker-flash" : ""
      }`}
    >
      {isFlashing && (
        <span
          aria-hidden
          className="absolute -top-2 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-900 shadow-lg"
        >
          {t("tracker.new")}
        </span>
      )}

      <div className="flex flex-1 items-center gap-2">
        <span
          className={`rounded-full border bg-slate-900 px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-slate-200 sm:text-base ${getMapBadgeClass(
            tracker.mapLv,
          )}`}
        >
          Lv.{tracker.mapLv}
        </span>
        <span
          className={`rounded-full border bg-slate-900 px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-slate-200 sm:text-base ${getMapBadgeClass(
            tracker.mapLv,
          )}`}
        >
          Ch.{tracker.ch}
        </span>
        <span className="rounded-full border border-slate-600 bg-slate-900 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
          {displayPhase}
          {tracker.presetSlot ? ` • P${tracker.presetSlot}` : ""}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ProgressRing percent={ringPercent} urgent={remainingSeconds < 60 * 25} />
        <span className="font-mono text-3xl font-bold tabular-nums text-sky-100 sm:text-4xl">
          {countdownText}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {tracker.isCustomTime && (
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-sm font-semibold text-sky-300 hover:border-sky-500"
            onClick={() => onSetTime(tracker.id)}
          >
            {t("tracker.setTime")}
          </button>
        )}
        <button
          type="button"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-sm font-semibold text-rose-300 hover:border-rose-500"
          onClick={() => onRemove(tracker.id)}
        >
          {t("tracker.remove")}
        </button>
      </div>
    </article>
  );
}

function ProgressRing({ percent, urgent }: { percent: number; urgent: boolean }) {
  const size = 38;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  const color = urgent ? "stroke-rose-400" : "stroke-sky-400";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${clamped}% remaining`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className="stroke-slate-700"
        strokeWidth={stroke}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className={`${color} transition-[stroke-dashoffset] duration-500`}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
