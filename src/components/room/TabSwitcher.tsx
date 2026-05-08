"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export type TabValue = "main" | "hardcore";

type Props = {
  value: TabValue;
  onChange: (tab: TabValue) => void;
};

export function TabSwitcher({ value, onChange }: Props) {
  const { t } = useLocale();

  function handleChange(tab: TabValue) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tosm-bt-active-tab", tab);
      } catch {
        // ignore storage errors
      }
    }
    onChange(tab);
  }

  const baseBtn =
    "flex-1 rounded-full py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400";
  const activeBtn = "bg-sky-600 text-white shadow";
  const inactiveBtn = "text-slate-400 hover:text-slate-200";

  return (
    <div className="flex rounded-full border border-slate-700 bg-slate-900 p-1 gap-1">
      <button
        type="button"
        className={`${baseBtn} ${value === "main" ? activeBtn : inactiveBtn}`}
        onClick={() => handleChange("main")}
        aria-pressed={value === "main"}
      >
        {t("tab.main")}
      </button>
      <button
        type="button"
        className={`${baseBtn} ${value === "hardcore" ? activeBtn : inactiveBtn}`}
        onClick={() => handleChange("hardcore")}
        aria-pressed={value === "hardcore"}
      >
        {t("tab.hardcore")}
      </button>
    </div>
  );
}

export function readInitialTab(): TabValue {
  if (typeof window === "undefined") return "main";
  try {
    const stored = localStorage.getItem("tosm-bt-active-tab");
    if (stored === "hardcore") return "hardcore";
  } catch {
    // ignore
  }
  return "main";
}
