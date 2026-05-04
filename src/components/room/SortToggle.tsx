"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { SortMode } from "@/lib/rows";

type Props = {
  value: SortMode;
  onChange: (value: SortMode) => void;
};

export function SortToggle({ value, onChange }: Props) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("time")}
        className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
          value === "time"
            ? "border-sky-500 bg-sky-950/30 text-sky-300"
            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
        }`}
      >
        {t("sort.byTime")}
      </button>
      <button
        type="button"
        onClick={() => onChange("channel")}
        className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
          value === "channel"
            ? "border-sky-500 bg-sky-950/30 text-sky-300"
            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
        }`}
      >
        {t("sort.byCh")}
      </button>
    </div>
  );
}
