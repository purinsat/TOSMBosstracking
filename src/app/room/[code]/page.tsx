"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { AddBossModal } from "@/components/room/AddBossModal";
import { AppBar } from "@/components/room/AppBar";
import { FiltersBar } from "@/components/room/FiltersBar";
import { MobileActionBar } from "@/components/room/MobileActionBar";
import { PromoSection } from "@/components/room/PromoSection";
import { SettingsModal } from "@/components/room/SettingsModal";
import { SortToggle } from "@/components/room/SortToggle";
import { TrackerList } from "@/components/room/TrackerList";
import { useDialogs } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useExpiryAlarm } from "@/hooks/useExpiryAlarm";
import { useNow } from "@/hooks/useNow";
import { useRoom } from "@/hooks/useRoom";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useRoomSettings } from "@/hooks/useRoomSettings";
import { useTrackers } from "@/hooks/useTrackers";
import { playNewTrackerSound } from "@/lib/audio";
import {
  parseCustomCountdownCommand,
  parseFlexibleDuration,
  parseQuickCommand,
} from "@/lib/commands";
import { getTotalMinutes } from "@/lib/countdown";
import { getPresetTimings } from "@/lib/mappers";
import {
  ALL_FILTERS,
  filterRows,
  getDistinctMapLvs,
  prepareRows,
  type RowFilters,
  type SortMode,
} from "@/lib/rows";
import type { Tracker } from "@/lib/types";

export default function RoomPage() {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const params = useParams<{ code: string }>();
  const roomCode = String(params.code || "").toUpperCase();

  const toast = useToast();
  const dialogs = useDialogs();
  const { t } = useLocale();

  const { room, loading: roomLoading, error: roomError } = useRoom(roomCode);
  const roomId = room?.id ?? null;

  const {
    settings,
    error: settingsError,
    saving: savingSettings,
    saveSettings,
    updateSoundSettings,
  } = useRoomSettings(roomId);

  const {
    trackers,
    error: trackersError,
    flashedTrackerIds,
    addTracker,
    removeTracker,
    setCustomTrackerTime,
    removeExpiredLocally,
  } = useTrackers(roomId);

  const nowMs = useNow();
  const presenceCount = useRoomPresence(roomId);

  const [sortMode, setSortMode] = useState<SortMode>("time");
  const [filters, setFilters] = useState<RowFilters>(ALL_FILTERS);
  const [grouped, setGrouped] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useExpiryAlarm(trackers, settings, nowMs, removeExpiredLocally);

  const flashAudioContextRef = useRef<AudioContext | null>(null);
  const lastFlashedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const previous = lastFlashedIdsRef.current;
    let hasNew = false;
    for (const id of flashedTrackerIds) {
      if (!previous.has(id)) {
        hasNew = true;
        break;
      }
    }
    if (hasNew) {
      void playNewTrackerSound(flashAudioContextRef, settings.soundVolume, settings.soundMuted);
    }
    lastFlashedIdsRef.current = new Set(flashedTrackerIds);
  }, [flashedTrackerIds, settings.soundVolume, settings.soundMuted]);

  const rows = useMemo(
    () => prepareRows(trackers, settings, nowMs, sortMode),
    [trackers, settings, nowMs, sortMode],
  );

  const availableMapLvs = useMemo(() => getDistinctMapLvs(rows), [rows]);
  const visibleRows = useMemo(() => filterRows(rows, filters), [rows, filters]);

  const combinedError = roomError || settingsError || trackersError;

  async function handleAddSubmit({ quick, custom }: { quick: string; custom: string }) {
    if (!roomId) return;

    if (!quick.trim() && !custom.trim()) {
      toast.error(t("add.errorEmpty"));
      return;
    }

    let mapLv = 0;
    let ch = 0;
    let phase: Tracker["phase"] = "No event";
    let noEventMinutes = 0;
    let presetSlot: 1 | 2 | 3 | null = 1;
    let isCustomTime = false;
    let customMinutes: number | null = null;

    if (custom.trim()) {
      const parsed = parseCustomCountdownCommand(custom);
      if (!parsed) {
        toast.error(t("add.errorCustomInvalid"));
        return;
      }
      mapLv = parsed.mapLv;
      ch = parsed.ch;
      presetSlot = parsed.presetSlot;
      phase = parsed.presetSlot ? "1" : "No event";
      customMinutes = parsed.countdownMinutes;
      isCustomTime = true;
    } else {
      const parsed = parseQuickCommand(quick, settings);
      if (!parsed) {
        toast.error(t("add.errorQuickInvalid"));
        return;
      }
      mapLv = parsed.mapLv;
      ch = parsed.ch;
      phase = parsed.phase;
      noEventMinutes = parsed.noEventMinutes;
      customMinutes = parsed.totalMinutesOverride ?? null;
      presetSlot = parsed.presetSlot;
    }

    const presetTimings = presetSlot ? getPresetTimings(settings, presetSlot) : null;
    if (presetSlot && !presetTimings) {
      toast.error(t("add.errorPresetBlank", { slot: presetSlot }));
      return;
    }

    const totalMinutes = customMinutes ?? getTotalMinutes(phase, presetTimings!, noEventMinutes);
    const targetAt = new Date(Date.now() + totalMinutes * 60000).toISOString();

    const inserted = await addTracker({
      roomId,
      mapLv,
      ch,
      phase,
      noEventMinutes,
      presetSlot,
      isCustomTime,
      targetAt,
    });

    if (inserted) {
      setShowAdd(false);
      toast.success(t("add.success"));
    } else {
      toast.error(t("add.failure"));
    }
  }

  async function handleSetTime(id: string) {
    const tracker = trackers.find((item) => item.id === id);
    if (!tracker) return;
    const raw = await dialogs.prompt({
      title: t("setTime.title"),
      message: t("setTime.message", { lv: tracker.mapLv, ch: tracker.ch }),
      placeholder: "30",
      confirmLabel: t("action.set"),
      validate: (value) =>
        parseFlexibleDuration(value) === null ? t("setTime.invalid") : null,
    });
    if (raw === null) return;

    const minutes = parseFlexibleDuration(raw);
    if (minutes === null) {
      toast.error(t("setTime.invalid"));
      return;
    }
    const ok = await setCustomTrackerTime(id, minutes);
    if (!ok) toast.error(t("setTime.failure"));
  }

  if (!isHydrated || roomLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-slate-300">
          {t("room.loading")}
        </div>
      </main>
    );
  }

  if (combinedError && !room) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-rose-300">{combinedError}</p>
          <Link href="/" className="text-sky-300 underline underline-offset-4">
            {t("room.back")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 pb-28 text-slate-100 md:pb-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <AppBar
          roomCode={roomCode}
          roomName={room?.name ?? null}
          soundMuted={settings.soundMuted}
          soundVolume={settings.soundVolume}
          presenceCount={presenceCount > 0 ? presenceCount : undefined}
          onToggleMute={() => void updateSoundSettings({ soundMuted: !settings.soundMuted })}
          onVolumeChange={(volume) => void updateSoundSettings({ soundVolume: volume })}
          onOpenSettings={() => setShowSettings(true)}
        />

        {combinedError && (
          <p className="rounded-xl border border-rose-500/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {combinedError}
          </p>
        )}

        <button
          className="flex h-20 items-center justify-center gap-3 rounded-full border-2 border-dashed border-slate-600 bg-slate-900/60 hover:border-sky-400"
          type="button"
          onClick={() => setShowAdd(true)}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-sky-400 text-3xl leading-none text-sky-300">
            +
          </span>
          <span className="text-base text-slate-300">{t("action.addBoss")}</span>
        </button>

        <SortToggle value={sortMode} onChange={setSortMode} />

        <FiltersBar
          filters={filters}
          availableMapLvs={availableMapLvs}
          grouped={grouped}
          onFiltersChange={setFilters}
          onToggleGrouped={() => setGrouped((prev) => !prev)}
        />

        <TrackerList
          rows={visibleRows}
          flashedIds={flashedTrackerIds}
          grouped={grouped}
          onRemove={(id) => void removeTracker(id)}
          onSetTime={(id) => void handleSetTime(id)}
        />

        <PromoSection />
      </div>

      <MobileActionBar
        soundMuted={settings.soundMuted}
        sortMode={sortMode}
        onAdd={() => setShowAdd(true)}
        onToggleMute={() => void updateSoundSettings({ soundMuted: !settings.soundMuted })}
        onCycleSort={() => setSortMode((prev) => (prev === "time" ? "channel" : "time"))}
      />

      <AddBossModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleAddSubmit}
      />

      <SettingsModal
        open={showSettings}
        settings={settings}
        saving={savingSettings}
        onClose={() => setShowSettings(false)}
        onSave={saveSettings}
      />
    </main>
  );
}
