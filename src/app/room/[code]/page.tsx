"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { AddBossModal } from "@/components/room/AddBossModal";
import { AppBar } from "@/components/room/AppBar";
import { FiltersBar } from "@/components/room/FiltersBar";
import { HardcoreAddBar } from "@/components/room/HardcoreAddBar";
import { HardcoreTrackerGrid } from "@/components/room/HardcoreTrackerGrid";
import { MobileActionBar } from "@/components/room/MobileActionBar";
import { PromoSection } from "@/components/room/PromoSection";
import { SettingsModal } from "@/components/room/SettingsModal";
import { SortToggle } from "@/components/room/SortToggle";
import { readInitialTab, TabSwitcher } from "@/components/room/TabSwitcher";
import type { TabValue } from "@/components/room/TabSwitcher";
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
  parseManualPhaseCommand,
  parseQuickCommand,
} from "@/lib/commands";
import { getTotalMinutes } from "@/lib/countdown";
import { getPresetTimings } from "@/lib/mappers";
import {
  ALL_FILTERS,
  applyFrozenOrder,
  filterRows,
  getDistinctMapLvs,
  prepareManualPhaseRows,
  prepareRows,
  type HardcoreSortMode,
  type RowFilters,
  type SortMode,
} from "@/lib/rows";
import type { Tracker } from "@/lib/types";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

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
    resetTrackerTime,
    updateTrackerPhaseDecimal,
    updateManualPhaseTracker,
    removeExpiredLocally,
  } = useTrackers(roomId);

  const nowMs = useNow();
  const presenceCount = useRoomPresence(roomId);

  const [tab, setTab] = useState<TabValue>("main");
  const [sortMode, setSortMode] = useState<SortMode>("time");
  const [hardcoreLastSort, setHardcoreLastSort] = useState<HardcoreSortMode>("time");
  const [hardcoreOrder, setHardcoreOrder] = useState<string[] | null>(null);
  const [hideHardcoreCooldown, setHideHardcoreCooldown] = useState(false);
  const [filters, setFilters] = useState<RowFilters>(ALL_FILTERS);
  const [grouped, setGrouped] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Read persisted tab on first client render
  useEffect(() => {
    setTab(readInitialTab());
  }, []);

  // Read persisted hide-cooldown preference
  useEffect(() => {
    try {
      if (window.localStorage.getItem("hardcoreHideCooldown") === "1") {
        setHideHardcoreCooldown(true);
      }
    } catch {}
  }, []);

  function toggleHideCooldown() {
    setHideHardcoreCooldown((prev) => {
      const next = !prev;
      try { window.localStorage.setItem("hardcoreHideCooldown", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  // Split trackers by kind
  const presetTrackers = useMemo(
    () => trackers.filter((t) => t.kind === "preset"),
    [trackers],
  );
  const manualPhaseTrackers = useMemo(
    () => trackers.filter((t) => t.kind === "manual_phase"),
    [trackers],
  );

  // Auto-remove manual_phase trackers that have been counting forward > 5 hours
  useEffect(() => {
    if (nowMs === 0) return;
    const expired = manualPhaseTrackers
      .filter((t) => {
        const targetMs = new Date(t.targetAt).getTime();
        return nowMs > targetMs + FIVE_HOURS_MS;
      })
      .map((t) => t.id);
    if (expired.length > 0) removeExpiredLocally(expired);
  }, [nowMs, manualPhaseTrackers, removeExpiredLocally]);

  // Auto-bump "No event" trackers to Phase 1 once their countdown reaches 0
  const autoBumpedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (nowMs === 0) return;
    for (const tracker of manualPhaseTrackers) {
      const phase = tracker.phaseDecimal ?? 0;
      if (phase !== 0) continue; // only "No event" trackers
      const targetMs = new Date(tracker.targetAt).getTime();
      if (nowMs < targetMs) continue; // still counting down
      if (autoBumpedIdsRef.current.has(tracker.id)) continue; // already fired
      autoBumpedIdsRef.current.add(tracker.id);
      void updateTrackerPhaseDecimal(tracker.id, 1.0);
    }
  }, [nowMs, manualPhaseTrackers, updateTrackerPhaseDecimal]);

  // Only alarm/expire preset trackers
  useExpiryAlarm(presetTrackers, settings, nowMs, removeExpiredLocally);

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
    () => prepareRows(presetTrackers, settings, nowMs, sortMode),
    [presetTrackers, settings, nowMs, sortMode],
  );

  const hardcoreRows = useMemo(() => {
    const baseMode: HardcoreSortMode =
      hardcoreLastSort === "lv-asc" || hardcoreLastSort === "lv-desc"
        ? hardcoreLastSort
        : "time";
    return prepareManualPhaseRows(manualPhaseTrackers, nowMs, baseMode);
  }, [manualPhaseTrackers, nowMs, hardcoreLastSort]);

  const orderedHardcoreRows = useMemo(() => {
    // Lv modes are live-sorted via hardcoreRows; skip frozen order
    if (hardcoreLastSort === "lv-asc" || hardcoreLastSort === "lv-desc") {
      return hardcoreRows;
    }
    return applyFrozenOrder(hardcoreRows, hardcoreOrder);
  }, [hardcoreRows, hardcoreOrder, hardcoreLastSort]);

  const visibleHardcoreRows = useMemo(() => {
    if (!hideHardcoreCooldown) return orderedHardcoreRows;
    return orderedHardcoreRows.filter((r) => (r.tracker.phaseDecimal ?? 0) !== 0);
  }, [orderedHardcoreRows, hideHardcoreCooldown]);

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
      kind: "preset",
    });

    if (inserted) {
      setShowAdd(false);
      toast.success(t("add.success"));
    } else {
      toast.error(t("add.failure"));
    }
  }

  function handleHardcoreSort(mode: HardcoreSortMode) {
    setHardcoreLastSort(mode);
    if (mode === "lv-asc" || mode === "lv-desc") {
      // Live sort — no snapshot; clear any frozen order
      setHardcoreOrder(null);
      return;
    }
    const sorted = prepareManualPhaseRows(manualPhaseTrackers, nowMs, mode);
    setHardcoreOrder(sorted.map((r) => r.tracker.id));
  }

  async function handleAddHardcore(raw: string) {
    if (!roomId) return;
    const parsed = parseManualPhaseCommand(raw);
    if (!parsed) {
      toast.error(t("hardcore.errorInvalid"));
      return;
    }

    let targetAt: string;
    let phaseDecimal: number;

    if (parsed.phaseDecimal !== null) {
      targetAt = new Date(Date.now()).toISOString();
      phaseDecimal = parsed.phaseDecimal;
    } else {
      targetAt = new Date(Date.now() + (parsed.countdownMinutes ?? 0) * 60000).toISOString();
      phaseDecimal = 0;
    }

    // Upsert: if a tile for this Lv+Ch already exists, update it in place
    const existing = manualPhaseTrackers.find(
      (t) => t.mapLv === parsed.mapLv && t.ch === parsed.ch,
    );

    if (existing) {
      // Clear auto-bump record so a new countdown can fire phase 1 bump again
      autoBumpedIdsRef.current.delete(existing.id);
      const ok = await updateManualPhaseTracker(existing.id, { targetAt, phaseDecimal });
      if (!ok) toast.error(t("add.failure"));
      return;
    }

    const inserted = await addTracker({
      roomId,
      mapLv: parsed.mapLv,
      ch: parsed.ch,
      phase: "No event",
      noEventMinutes: 0,
      presetSlot: null,
      isCustomTime: true,
      targetAt,
      kind: "manual_phase",
      phaseDecimal,
    });

    if (!inserted) {
      toast.error(t("add.failure"));
    }
  }

  function handleCycleWhole(id: string) {
    const tracker = trackers.find((item) => item.id === id);
    if (!tracker) return;
    const current = tracker.phaseDecimal ?? 0;
    if (current >= 5.0) {
      // BOSS ON → reset to phase 1
      void updateTrackerPhaseDecimal(id, 1);
      return;
    }
    const currentWhole = current === 0 ? 0 : Math.floor(current);
    const nextWhole = currentWhole === 0 ? 1 : (currentWhole % 4) + 1;
    // Always a whole number — decimal resets to 0
    void updateTrackerPhaseDecimal(id, nextWhole);
  }

  function handleBumpDecimal(id: string) {
    const tracker = trackers.find((item) => item.id === id);
    if (!tracker || !tracker.phaseDecimal || tracker.phaseDecimal === 0) return;
    // No-op if already BOSS ON
    if (tracker.phaseDecimal >= 5.0) return;
    const whole = Math.floor(tracker.phaseDecimal);
    const currentDecimal = Math.round((tracker.phaseDecimal - whole) * 10);
    if (currentDecimal >= 9) {
      // Roll over: 3.9→4, 4.9→5 (BOSS ON)
      void updateTrackerPhaseDecimal(id, whole + 1);
    } else {
      void updateTrackerPhaseDecimal(id, whole + (currentDecimal + 1) / 10);
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

        <TabSwitcher value={tab} onChange={setTab} />

        {tab === "main" && (
          <>
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
          </>
        )}

        {tab === "hardcore" && (
          <>
            <HardcoreAddBar onSubmit={handleAddHardcore} />
            <HardcoreTrackerGrid
              rows={visibleHardcoreRows}
              lastSort={hardcoreLastSort}
              onSort={handleHardcoreSort}
              hideCooldown={hideHardcoreCooldown}
              onToggleHideCooldown={toggleHideCooldown}
              onRemove={(id) => void removeTracker(id)}
              onCycleWhole={handleCycleWhole}
              onBumpDecimal={handleBumpDecimal}
              onResetTime={(id) => void resetTrackerTime(id)}
            />
          </>
        )}

        <PromoSection />
      </div>

      <MobileActionBar
        soundMuted={settings.soundMuted}
        sortMode={sortMode}
        tab={tab}
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
