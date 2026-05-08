"use client";

import type { TabValue } from "@/components/room/TabSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { SortMode } from "@/lib/rows";

type Props = {
  soundMuted: boolean;
  sortMode: SortMode;
  tab: TabValue;
  onAdd: () => void;
  onToggleMute: () => void;
  onCycleSort: () => void;
};

export function MobileActionBar({
  soundMuted,
  sortMode,
  tab,
  onAdd,
  onToggleMute,
  onCycleSort,
}: Props) {
  const { t } = useLocale();
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-3 py-3">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={soundMuted ? t("mute.tooltipUnmute") : t("mute.tooltipMute")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-lg hover:border-sky-400"
        >
          {soundMuted ? "🔇" : "🔊"}
        </button>

        {tab === "main" && (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-sky-400 bg-sky-950/50 px-4 text-base font-semibold text-sky-100 hover:bg-sky-900/60"
          >
            <span className="text-2xl leading-none">+</span>
            {t("action.addBossShort")}
          </button>
        )}

        {tab === "hardcore" && (
          <div className="flex h-12 flex-1 items-center justify-center px-4">
            <span className="text-sm text-slate-500">{t("tab.hardcore")}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onCycleSort}
          aria-label={sortMode === "time" ? t("sort.byTime") : t("sort.byCh")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200 hover:border-sky-400"
          title={sortMode === "time" ? t("sort.byTime") : t("sort.byCh")}
        >
          {sortMode === "time" ? "⏱" : "#"}
        </button>
      </div>
    </div>
  );
}
