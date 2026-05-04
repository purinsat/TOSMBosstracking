"use client";

import Link from "next/link";

import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { useWhatsNew } from "@/components/ui/WhatsNewModal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Props = {
  roomCode: string;
  roomName: string | null;
  soundMuted: boolean;
  soundVolume: number;
  presenceCount?: number;
  rightActions?: React.ReactNode;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onOpenSettings: () => void;
};

export function AppBar({
  roomCode,
  roomName,
  soundMuted,
  soundVolume,
  presenceCount,
  rightActions,
  onToggleMute,
  onVolumeChange,
  onOpenSettings,
}: Props) {
  const { t } = useLocale();
  const { open: openWhatsNew } = useWhatsNew();

  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">
          TOSM Boss Tracking By PonderingTH
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <span>
            {t("room.code")}:{" "}
            <span className="font-semibold text-sky-300">{roomCode}</span>
          </span>
          <span>
            {t("room.name")}:{" "}
            <span className="font-semibold text-sky-300">
              {roomName || t("room.unnamed")}
            </span>
          </span>
          {typeof presenceCount === "number" && (
            <span
              title={t("presence.online", { count: presenceCount })}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold text-emerald-200"
            >
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {t("presence.online", { count: presenceCount })}
            </span>
          )}
          <button
            type="button"
            aria-label={soundMuted ? t("mute.tooltipUnmute") : t("mute.tooltipMute")}
            title={soundMuted ? t("mute.tooltipUnmute") : t("mute.tooltipMute")}
            onClick={onToggleMute}
            className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-sm hover:border-sky-400"
          >
            {soundMuted ? "🔇" : "🔊"}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={soundVolume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="h-2 w-24 accent-sky-400"
            aria-label={t("volume.aria")}
            title={`${t("volume.aria")} ${soundVolume}%`}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightActions}
        <LocaleToggle />
        <button
          type="button"
          onClick={openWhatsNew}
          title={t("app.whatsNew")}
          className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-sm font-semibold hover:border-sky-400 sm:px-3"
        >
          ✨
        </button>
        <Link
          href="/"
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold hover:border-sky-400 sm:px-4"
        >
          {t("app.leave")}
        </Link>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold hover:border-sky-400 sm:px-4"
        >
          {t("app.settings")}
        </button>
      </div>
    </header>
  );
}
