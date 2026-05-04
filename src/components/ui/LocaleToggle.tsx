"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function LocaleToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const next = locale === "en" ? "th" : "en";
  const label = locale === "en" ? "TH" : "EN";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={`Switch to ${label}`}
      title={`Switch to ${label}`}
      className={`rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400 ${className}`}
    >
      {locale === "en" ? "EN · TH" : "TH · EN"}
    </button>
  );
}
