"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MutableRefObject,
} from "react";

import {
  DEFAULT_SETTINGS,
  formatMinutesSeconds,
  getColorClasses,
  getDynamicPhaseDisplay,
  getTotalMinutes,
  parseDurationToMinutes,
} from "@/lib/countdown";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  DbRoom,
  DbRoomSettings,
  DbTracker,
  PhaseTimings,
  Room,
  Settings,
  Tracker,
} from "@/lib/types";

const TRACKERS_SELECT =
  "id, room_id, map_lv, ch, phase, no_event_minutes, preset_slot, is_custom_time, target_at, created_at";
const ROOM_SETTINGS_SELECT =
  "room_id, p12, p23, p34, p4on, preset1_name, preset2_name, preset2_p12, preset2_p23, preset2_p34, preset2_p4on, preset3_name, preset3_p12, preset3_p23, preset3_p34, preset3_p4on, sound_volume, sound_muted, updated_at";
type PresetTimingInputs = {
  p12: string;
  p23: string;
  p34: string;
  p4on: string;
};

export default function RoomPage() {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const params = useParams<{ code: string }>();
  const roomCode = String(params.code || "").toUpperCase();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [room, setRoom] = useState<Room | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sortMode, setSortMode] = useState<"time" | "channel">("time");
  const [quickCommandInput, setQuickCommandInput] = useState("");
  const [customTimeInput, setCustomTimeInput] = useState("");
  const [draftSettings, setDraftSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [draftPresetInputs, setDraftPresetInputs] = useState<[PresetTimingInputs, PresetTimingInputs, PresetTimingInputs]>(
    toPresetTimingInputs(DEFAULT_SETTINGS),
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fiveMinuteAlertedTrackerIdsRef = useRef<Set<string>>(new Set());

  const fetchOrCreateRoomSettings = useCallback(async (roomId: string): Promise<Settings | null> => {
    const { data, error: readError } = await supabase
      .from("room_settings")
      .select(ROOM_SETTINGS_SELECT)
      .eq("room_id", roomId)
      .maybeSingle<DbRoomSettings>();

    if (readError) {
      setError(readError.message);
      return null;
    }
    if (data) return mapSettings(data);

    const { data: created, error: createError } = await supabase
      .from("room_settings")
      .upsert(
        {
          room_id: roomId,
          p12: DEFAULT_SETTINGS.presets[0].timings?.p12 ?? 15,
          p23: DEFAULT_SETTINGS.presets[0].timings?.p23 ?? 11,
          p34: DEFAULT_SETTINGS.presets[0].timings?.p34 ?? 7,
          p4on: DEFAULT_SETTINGS.presets[0].timings?.p4on ?? 3,
          preset1_name: DEFAULT_SETTINGS.presets[0].name,
          preset2_name: DEFAULT_SETTINGS.presets[1].name || null,
          preset2_p12: null,
          preset2_p23: null,
          preset2_p34: null,
          preset2_p4on: null,
          preset3_name: DEFAULT_SETTINGS.presets[2].name || null,
          preset3_p12: null,
          preset3_p23: null,
          preset3_p34: null,
          preset3_p4on: null,
          sound_volume: DEFAULT_SETTINGS.soundVolume,
          sound_muted: DEFAULT_SETTINGS.soundMuted,
        },
        { onConflict: "room_id" },
      )
      .select(ROOM_SETTINGS_SELECT)
      .single<DbRoomSettings>();

    if (createError) {
      setError(createError.message);
      return null;
    }
    return mapSettings(created);
  }, [supabase]);

  useEffect(() => {
    if (!roomCode) return;
    let active = true;

    async function loadRoomAndData() {
      setLoading(true);
      setError("");
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("id, code, name, created_at")
        .eq("code", roomCode)
        .maybeSingle<DbRoom>();

      if (!active) return;

      if (roomError) {
        setError(roomError.message);
        setLoading(false);
        return;
      }

      if (!roomData) {
        setError("Room not found.");
        setLoading(false);
        return;
      }

      const mappedRoom = mapRoom(roomData);
      setRoom(mappedRoom);

      const nowIso = new Date().toISOString();
      await supabase
        .from("trackers")
        .delete()
        .eq("room_id", mappedRoom.id)
        .lte("target_at", nowIso);

      const [nextSettings, trackersResponse] = await Promise.all([
        fetchOrCreateRoomSettings(mappedRoom.id),
        supabase
          .from("trackers")
          .select(TRACKERS_SELECT)
          .eq("room_id", mappedRoom.id)
          .gt("target_at", nowIso)
          .order("target_at", { ascending: true })
          .returns<DbTracker[]>(),
      ]);

      if (!active) return;

      if (nextSettings) {
        setSettings(nextSettings);
        setDraftSettings(nextSettings);
        setDraftPresetInputs(toPresetTimingInputs(nextSettings));
      }

      if (trackersResponse.error) {
        setError(trackersResponse.error.message);
      } else {
        setTrackers((trackersResponse.data ?? []).map(mapTracker));
      }

      setNowMs(Date.now());
      setLoading(false);
    }

    void loadRoomAndData();
    return () => {
      active = false;
    };
  }, [roomCode, supabase, fetchOrCreateRoomSettings]);

  useEffect(() => {
    if (!room?.id) return;
    const channel = supabase
      .channel(`room-sync-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trackers",
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          const nowIso = new Date().toISOString();
          const { data } = await supabase
            .from("trackers")
            .select(TRACKERS_SELECT)
            .eq("room_id", room.id)
            .gt("target_at", nowIso)
            .order("target_at", { ascending: true })
            .returns<DbTracker[]>();
          setTrackers((data ?? []).map(mapTracker));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_settings",
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          const nextSettings = await fetchOrCreateRoomSettings(room.id);
          if (nextSettings) {
            setSettings(nextSettings);
            if (!showSettingsModal) {
              setDraftSettings(nextSettings);
              setDraftPresetInputs(toPresetTimingInputs(nextSettings));
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room?.id, supabase, showSettingsModal, fetchOrCreateRoomSettings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onUserGesture = () => {
      void ensureAudioContextReady(audioContextRef);
    };

    window.addEventListener("pointerdown", onUserGesture);
    window.addEventListener("keydown", onUserGesture);
    return () => {
      window.removeEventListener("pointerdown", onUserGesture);
      window.removeEventListener("keydown", onUserGesture);
    };
  }, []);

  useEffect(() => {
    if (!room?.id || !settings) return;
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNowMs(currentTime);

      const notifiedSet = fiveMinuteAlertedTrackerIdsRef.current;
      const activeIds = new Set(trackers.map((tracker) => tracker.id));
      for (const trackerId of [...notifiedSet]) {
        if (!activeIds.has(trackerId)) {
          notifiedSet.delete(trackerId);
        }
      }

      const newlyNearFiveMinutes: string[] = [];
      const removeIds: string[] = [];
      for (const tracker of trackers) {
        const endAtMs = new Date(tracker.targetAt).getTime();
        const remainingSeconds = Math.floor((endAtMs - currentTime) / 1000);
        if (remainingSeconds <= 300 && remainingSeconds > 0 && !notifiedSet.has(tracker.id)) {
          notifiedSet.add(tracker.id);
          newlyNearFiveMinutes.push(tracker.id);
        }
        if (endAtMs <= currentTime) {
          removeIds.push(tracker.id);
        }
      }

      if (newlyNearFiveMinutes.length > 0) {
        void playTimeoutSound(
          audioContextRef,
          settings.soundVolume,
          settings.soundMuted,
          newlyNearFiveMinutes.length,
        );
      }

      if (removeIds.length === 0) return;
      for (const removeId of removeIds) {
        notifiedSet.delete(removeId);
      }

      setTrackers((prev) => prev.filter((tracker) => !removeIds.includes(tracker.id)));
      void supabase.from("trackers").delete().eq("room_id", room.id).in("id", removeIds);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [room?.id, settings, supabase, trackers]);

  useEffect(() => {
    if (!room?.id) return;

    const poll = window.setInterval(async () => {
      const nowIso = new Date().toISOString();
      const [trackersResponse, settingsResponse] = await Promise.all([
        supabase
          .from("trackers")
          .select(TRACKERS_SELECT)
          .eq("room_id", room.id)
          .gt("target_at", nowIso)
          .order("target_at", { ascending: true })
          .returns<DbTracker[]>(),
        supabase
          .from("room_settings")
          .select(ROOM_SETTINGS_SELECT)
          .eq("room_id", room.id)
          .maybeSingle<DbRoomSettings>(),
      ]);

      if (!trackersResponse.error && trackersResponse.data) {
        setTrackers(trackersResponse.data.map(mapTracker));
      }

      if (!settingsResponse.error && settingsResponse.data) {
        const nextSettings = mapSettings(settingsResponse.data);
        setSettings(nextSettings);
        if (!showSettingsModal) {
          setDraftSettings(nextSettings);
          setDraftPresetInputs(toPresetTimingInputs(nextSettings));
        }
      } else if (!settingsResponse.error && !settingsResponse.data) {
        const nextSettings = await fetchOrCreateRoomSettings(room.id);
        if (nextSettings) {
          setSettings(nextSettings);
          if (!showSettingsModal) {
            setDraftSettings(nextSettings);
            setDraftPresetInputs(toPresetTimingInputs(nextSettings));
          }
        }
      }
    }, 4000);

    return () => window.clearInterval(poll);
  }, [room?.id, supabase, showSettingsModal, fetchOrCreateRoomSettings]);

  const sortedRows = useMemo(() => {
    const rows = [...trackers]
      .map((tracker) => {
        const remainingSeconds = Math.max(
          0,
          Math.floor((new Date(tracker.targetAt).getTime() - nowMs) / 1000),
        );
        const presetTimings = tracker.presetSlot ? getPresetTimings(settings, tracker.presetSlot) : null;
        const displayPhase = presetTimings
          ? getDynamicPhaseDisplayWithDecimal(
              tracker.phase,
              remainingSeconds,
              presetTimings,
              tracker.noEventMinutes,
            )
          : "N/A";
        return { tracker, remainingSeconds, displayPhase };
      });

    if (sortMode === "channel") {
      return rows.sort((a, b) => {
        if (a.tracker.ch !== b.tracker.ch) return a.tracker.ch - b.tracker.ch;
        return a.remainingSeconds - b.remainingSeconds;
      });
    }

    return rows.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  }, [trackers, nowMs, settings, sortMode]);

  function openAddModal() {
    setQuickCommandInput("");
    setCustomTimeInput("");
    setShowAddModal(true);
  }

  async function submitAddForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!room?.id) return;

    let mapLv = 0;
    let ch = 0;
    let phase: Tracker["phase"] = "No event";
    let noEventMinutes = 0;
    let customMinutes: number | null = null;
    let presetSlot: 1 | 2 | 3 | null = 1;
    let isCustomTime = false;

    if (!customTimeInput.trim() && !quickCommandInput.trim()) {
      window.alert("Please enter either Quick command or Custom command.");
      return;
    }

    if (customTimeInput.trim()) {
      const parsedCustom = parseCustomCountdownCommand(customTimeInput);
      if (!parsedCustom) {
        window.alert(
          "Custom command invalid. Use: '103 12 5', '103 12 2:12', '103 12 :5', or add preset: '103 12 :30 2'.",
        );
        return;
      }
      mapLv = parsedCustom.mapLv;
      ch = parsedCustom.ch;
      presetSlot = parsedCustom.presetSlot;
      phase = parsedCustom.presetSlot ? "1" : "No event";
      customMinutes = parsedCustom.countdownMinutes;
      isCustomTime = true;
    } else if (quickCommandInput.trim()) {
      const parsed = parseQuickCommand(quickCommandInput, settings);
      if (!parsed) {
        window.alert(
          "Quick command invalid. Example: '103 12 3', '103 12 2.75 2', '103 13 04:32', or '103 13 :5 3'.",
        );
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
      window.alert(`Preset ${presetSlot} is blank. Please set timings in Settings first.`);
      return;
    }

    const totalMinutes = customMinutes ?? getTotalMinutes(phase, presetTimings!, noEventMinutes);
    const now = Date.now();
    const optimistic: Tracker = {
      id: `tmp_${now}`,
      roomId: room.id,
      mapLv,
      ch,
      phase,
      noEventMinutes,
      presetSlot,
      isCustomTime,
      targetAt: new Date(now + totalMinutes * 60000).toISOString(),
      createdAt: new Date(now).toISOString(),
    };

    setTrackers((prev) => [...prev, optimistic]);
    setShowAddModal(false);

    const { data, error: insertError } = await supabase
      .from("trackers")
      .insert({
        room_id: room.id,
        map_lv: mapLv,
        ch,
        phase,
        no_event_minutes: noEventMinutes,
        preset_slot: presetSlot,
        is_custom_time: isCustomTime,
        target_at: optimistic.targetAt,
      })
      .select(TRACKERS_SELECT)
      .single<DbTracker>();

    if (insertError || !data) {
      setTrackers((prev) => prev.filter((item) => item.id !== optimistic.id));
      setError(insertError?.message ?? "Failed to add tracker.");
      return;
    }

    const inserted = mapTracker(data);
    setTrackers((prev) =>
      prev.map((item) => (item.id === optimistic.id ? inserted : item)),
    );
  }

  async function removeTracker(id: string) {
    if (!room?.id) return;
    const snapshot = trackers;
    fiveMinuteAlertedTrackerIdsRef.current.delete(id);
    setTrackers((prev) => prev.filter((item) => item.id !== id));

    const { error: deleteError } = await supabase
      .from("trackers")
      .delete()
      .eq("room_id", room.id)
      .eq("id", id);

    if (deleteError) {
      setTrackers(snapshot);
      setError(deleteError.message);
    }
  }

  async function updateCustomTrackerTime(tracker: Tracker) {
    if (!room?.id) return;
    const raw = window.prompt(
      "Set new countdown time. Examples: 30, 2:12, :30",
      "",
    );
    if (raw === null) return;

    const nextMinutes = parseFlexibleDuration(raw);
    if (nextMinutes === null) {
      window.alert("Invalid time format. Use minutes (30), H:MM (2:12), or :MM (:30).");
      return;
    }

    const nextTargetAt = new Date(Date.now() + nextMinutes * 60000).toISOString();
    const snapshot = trackers;
    setTrackers((prev) =>
      prev.map((item) => (item.id === tracker.id ? { ...item, targetAt: nextTargetAt } : item)),
    );

    const { error: updateError } = await supabase
      .from("trackers")
      .update({ target_at: nextTargetAt })
      .eq("room_id", room.id)
      .eq("id", tracker.id);

    if (updateError) {
      setTrackers(snapshot);
      setError(updateError.message);
    }
  }

  async function saveSettings() {
    if (!room?.id || savingSettings) return;
    setSavingSettings(true);
    setError("");

    const previous = settings;
    const normalizedDraftSettings = applyPresetInputsToSettings(draftSettings, draftPresetInputs);
    setSettings(normalizedDraftSettings);
    setDraftSettings(normalizedDraftSettings);
    setDraftPresetInputs(toPresetTimingInputs(normalizedDraftSettings));

    const { error: updateError } = await supabase
      .from("room_settings")
      .upsert(toRoomSettingsPayload(room.id, normalizedDraftSettings), { onConflict: "room_id" })
      .select("room_id")
      .single()
      .then(({ error }) => ({ error }));

    if (updateError) {
      setSettings(previous);
      setDraftSettings(previous);
      setDraftPresetInputs(toPresetTimingInputs(previous));
      setError(updateError.message);
    } else {
      setShowSettingsModal(false);
    }

    setSavingSettings(false);
  }

  async function updateSoundSettings(next: Partial<Pick<Settings, "soundMuted" | "soundVolume">>) {
    if (!room?.id) return;
    const previous = settings;
    const merged = { ...settings, ...next };
    setSettings(merged);
    setDraftSettings((prev) => ({ ...prev, ...next }));
    setError("");

    const { error: updateError } = await supabase
      .from("room_settings")
      .upsert(toRoomSettingsPayload(room.id, merged), { onConflict: "room_id" })
      .select("room_id")
      .single()
      .then(({ error }) => ({ error }));

    if (updateError) {
      setSettings(previous);
      setDraftSettings((prev) => ({
        ...prev,
        soundMuted: previous.soundMuted,
        soundVolume: previous.soundVolume,
      }));
      setError(updateError.message);
    }
  }

  function updateDraftPresetName(slot: 1 | 2 | 3, value: string) {
    setDraftSettings((prev) => {
      const presets = [...prev.presets] as Settings["presets"];
      presets[slot - 1] = { ...presets[slot - 1], name: value };
      return { ...prev, presets };
    });
  }

  function updateDraftPresetNumber(slot: 1 | 2 | 3, key: keyof PhaseTimings, value: string) {
    if (value.trim() !== "") {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) return;
    }

    setDraftPresetInputs((prev) => {
      const next = [...prev] as [PresetTimingInputs, PresetTimingInputs, PresetTimingInputs];
      next[slot - 1] = { ...next[slot - 1], [key]: value };
      return next;
    });
  }

  if (!isHydrated || loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-slate-300">
          Loading room...
        </div>
      </main>
    );
  }

  if (error && !room) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-rose-300">{error}</p>
          <Link href="/" className="text-sky-300 underline underline-offset-4">
            Back to room chooser
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-wide">
              TOSM Boss Tracking By PonderingTH
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <p>
                Room Code: <span className="font-semibold text-sky-300">{roomCode}</span>
              </p>
              <p>
                Room Name:{" "}
                <span className="font-semibold text-sky-300">{room?.name ?? "Unnamed Room"}</span>
              </p>
              <button
                type="button"
                aria-label={settings.soundMuted ? "Unmute sound" : "Mute sound"}
                title={settings.soundMuted ? "Unmute alarm" : "Mute alarm"}
                onClick={() =>
                  void updateSoundSettings({ soundMuted: !settings.soundMuted })
                }
                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-sm hover:border-sky-400"
              >
                {settings.soundMuted ? "🔇" : "🔊"}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={settings.soundVolume}
                onChange={(e) =>
                  void updateSoundSettings({ soundVolume: Number(e.target.value) })
                }
                className="h-2 w-24 accent-sky-400"
                aria-label="Alarm volume"
                title={`Alarm volume ${settings.soundVolume}%`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-semibold hover:border-sky-400"
            >
              Leave Room
            </Link>
            <button
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-semibold hover:border-sky-400"
              onClick={() => {
                setDraftSettings(settings);
                setDraftPresetInputs(toPresetTimingInputs(settings));
                setShowSettingsModal(true);
              }}
              type="button"
            >
              Settings
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-500/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <button
          className="flex h-20 items-center justify-center gap-3 rounded-full border-2 border-dashed border-slate-600 bg-slate-900/60 hover:border-sky-400"
          type="button"
          onClick={openAddModal}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-sky-400 text-3xl leading-none text-sky-300">
            +
          </span>
          <span className="text-base text-slate-300">Add Boss Tracking</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortMode("time")}
            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
              sortMode === "time"
                ? "border-sky-500 bg-sky-950/30 text-sky-300"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Sort by Time
          </button>
          <button
            type="button"
            onClick={() => setSortMode("channel")}
            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
              sortMode === "channel"
                ? "border-sky-500 bg-sky-950/30 text-sky-300"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Sort by Ch
          </button>
        </div>

        <section className="flex flex-col gap-3">
          {sortedRows.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-center text-slate-400">
              No boss tracking yet. Tap + to add one.
            </div>
          ) : (
            sortedRows.map(({ tracker, remainingSeconds, displayPhase }) => {
              const color = getColorClasses(Math.ceil(remainingSeconds / 60));
              const countdownText = formatMinutesSeconds(remainingSeconds);
              return (
                <article
                  key={tracker.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-full border-2 px-5 py-4 ${color}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border bg-slate-900 px-3 py-1.5 text-base font-semibold uppercase tracking-wide text-slate-200 ${getMapBadgeClass(
                        tracker.mapLv,
                      )}`}
                    >
                      Lv.{tracker.mapLv}
                    </span>
                    <span
                      className={`rounded-full border bg-slate-900 px-3 py-1.5 text-base font-semibold uppercase tracking-wide text-slate-200 ${getMapBadgeClass(
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
                  <p className="text-2xl font-bold tracking-wide text-sky-100">
                    Countdown: <span className="font-bold text-sky-200">{countdownText}</span>
                  </p>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-sm font-semibold text-rose-300 hover:border-rose-500"
                    onClick={() => removeTracker(tracker.id)}
                  >
                    Remove
                  </button>
                  {tracker.isCustomTime && (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-sm font-semibold text-sky-300 hover:border-sky-500"
                      onClick={() => void updateCustomTrackerTime(tracker)}
                    >
                      Set Time
                    </button>
                  )}
                </article>
              );
            })
          )}
        </section>
        <section className="mt-1 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-center">
          <p className="text-base text-slate-200">
            Please Subscribe at{" "}
            <a
              href="https://www.youtube.com/@PonderingTH"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-300 underline underline-offset-4"
            >
              youtube.com/@PonderingTH
            </a>
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Feel free to support us by Join our membership or this link{" "}
            <a
              href="https://tipme.in.th/ponderingth"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-300 underline underline-offset-4"
            >
              tipme.in.th/ponderingth
            </a>
          </p>
          <p className="mt-2 text-sm text-slate-400">Thanks and enjoyed !</p>
        </section>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="mb-4 text-xl font-bold">Add Boss Tracking</h2>
            <form className="space-y-4" onSubmit={submitAddForm}>
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Quick command
                </label>
                <input
                  type="text"
                  value={quickCommandInput}
                  onChange={(e) => setQuickCommandInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                  placeholder="103 12 3 or 103 12 2.5 1 or 103 13 :5 2"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Quick: <code>Lv Ch Last [Preset]</code>. Example: <code>103 2 2.5 1</code>.
                  Last can be 1-4, decimal phase (2.5), H:MM, or :MM. Preset is optional (1-3),
                  default is 1.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Custom command (optional, bypass phase defaults)
                </label>
                <input
                  type="text"
                  value={customTimeInput}
                  onChange={(e) => setCustomTimeInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                  placeholder="103 12 5 or 103 12 :30 2"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Custom: <code>Lv Ch Duration [Preset]</code>. Example: <code>103 2 :30 2</code>{" "}
                  or <code>103 2 :30</code>. Duration sets the countdown directly. Preset is
                  optional; without preset, phase shows N/A.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl border border-sky-500 px-4 py-2 font-semibold text-sky-300"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="mb-4 text-xl font-bold">Phase Presets</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {[1, 2, 3].map((slot) => {
                const preset = draftSettings.presets[slot - 1];
                const timingInputs = draftPresetInputs[slot - 1];
                return (
                  <section key={slot} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                    <label className="block text-sm text-slate-300">
                      <span className="mb-1 block">Preset {slot} Name</span>
                      <input
                        type="text"
                        value={preset.name}
                        onChange={(e) => updateDraftPresetName(slot as 1 | 2 | 3, e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                        placeholder={`Preset ${slot}`}
                      />
                    </label>
                    <div className="mt-3 space-y-2">
                      {(
                        [
                          ["p12", "Phase 1 -> 2"],
                          ["p23", "Phase 2 -> 3"],
                          ["p34", "Phase 3 -> 4"],
                          ["p4on", "Phase 4 -> On"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="block text-sm text-slate-300">
                          <span className="mb-1 block">{label}</span>
                          <input
                            type="number"
                            min={0}
                            value={timingInputs[key]}
                            onChange={(e) =>
                              updateDraftPresetNumber(slot as 1 | 2 | 3, key, e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                            placeholder={slot === 1 ? "0" : "Blank"}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-700 px-4 py-2"
                onClick={() => {
                  setDraftSettings(settings);
                  setDraftPresetInputs(toPresetTimingInputs(settings));
                  setShowSettingsModal(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl border border-sky-500 px-4 py-2 font-semibold text-sky-300 disabled:opacity-60"
                onClick={saveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function mapRoom(room: DbRoom): Room {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    createdAt: room.created_at,
  };
}

function mapSettings(settings: DbRoomSettings): Settings {
  return {
    presets: [
      {
        name: settings.preset1_name || "Preset 1",
        timings: {
          p12: settings.p12,
          p23: settings.p23,
          p34: settings.p34,
          p4on: settings.p4on,
        },
      },
      {
        name: settings.preset2_name || "Preset 2",
        timings: isCompleteTimingSet(
          settings.preset2_p12,
          settings.preset2_p23,
          settings.preset2_p34,
          settings.preset2_p4on,
        )
          ? {
              p12: settings.preset2_p12!,
              p23: settings.preset2_p23!,
              p34: settings.preset2_p34!,
              p4on: settings.preset2_p4on!,
            }
          : null,
      },
      {
        name: settings.preset3_name || "Preset 3",
        timings: isCompleteTimingSet(
          settings.preset3_p12,
          settings.preset3_p23,
          settings.preset3_p34,
          settings.preset3_p4on,
        )
          ? {
              p12: settings.preset3_p12!,
              p23: settings.preset3_p23!,
              p34: settings.preset3_p34!,
              p4on: settings.preset3_p4on!,
            }
          : null,
      },
    ],
    soundVolume: settings.sound_volume,
    soundMuted: settings.sound_muted,
  };
}

function mapTracker(row: DbTracker): Tracker {
  return {
    id: row.id,
    roomId: row.room_id,
    mapLv: row.map_lv,
    ch: row.ch,
    phase: row.phase,
    noEventMinutes: row.no_event_minutes,
    presetSlot: row.preset_slot,
    isCustomTime: Boolean(row.is_custom_time),
    targetAt: row.target_at,
    createdAt: row.created_at,
  };
}

function isCompleteTimingSet(
  p12: number | null,
  p23: number | null,
  p34: number | null,
  p4on: number | null,
): boolean {
  return p12 !== null && p23 !== null && p34 !== null && p4on !== null;
}

function getPresetTimings(settings: Settings, presetSlot: 1 | 2 | 3): PhaseTimings | null {
  return settings.presets[presetSlot - 1]?.timings ?? null;
}

function toPresetTimingInputs(
  settings: Settings,
): [PresetTimingInputs, PresetTimingInputs, PresetTimingInputs] {
  return settings.presets.map((preset) => ({
    p12: preset.timings?.p12 != null ? String(preset.timings.p12) : "",
    p23: preset.timings?.p23 != null ? String(preset.timings.p23) : "",
    p34: preset.timings?.p34 != null ? String(preset.timings.p34) : "",
    p4on: preset.timings?.p4on != null ? String(preset.timings.p4on) : "",
  })) as [PresetTimingInputs, PresetTimingInputs, PresetTimingInputs];
}

function applyPresetInputsToSettings(
  settings: Settings,
  inputs: [PresetTimingInputs, PresetTimingInputs, PresetTimingInputs],
): Settings {
  const presets = settings.presets.map((preset, idx) => ({
    ...preset,
    timings: {
      p12: parsePresetInputValue(inputs[idx].p12),
      p23: parsePresetInputValue(inputs[idx].p23),
      p34: parsePresetInputValue(inputs[idx].p34),
      p4on: parsePresetInputValue(inputs[idx].p4on),
    },
  })) as Settings["presets"];

  return { ...settings, presets };
}

function parsePresetInputValue(raw: string): number {
  if (raw.trim() === "") return 0;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
}

function getDynamicPhaseDisplayWithDecimal(
  startPhase: Tracker["phase"],
  remainingSeconds: number,
  timings: PhaseTimings,
  noEventMinutes: number,
): string {
  const base = getDynamicPhaseDisplay(startPhase, remainingSeconds, timings, noEventMinutes);
  if (!["1", "2", "3", "4"].includes(base)) return base;

  const remainingMinutes = remainingSeconds / 60;
  const p2Start = timings.p23 + timings.p34 + timings.p4on;
  const p3Start = timings.p34 + timings.p4on;
  const p4Start = timings.p4on;

  let phaseRemaining = 0;
  let phaseDuration = 0;
  if (base === "1") {
    phaseRemaining = remainingMinutes - p2Start;
    phaseDuration = timings.p12;
  } else if (base === "2") {
    phaseRemaining = remainingMinutes - p3Start;
    phaseDuration = timings.p23;
  } else if (base === "3") {
    phaseRemaining = remainingMinutes - p4Start;
    phaseDuration = timings.p34;
  } else {
    phaseRemaining = remainingMinutes;
    phaseDuration = timings.p4on;
  }

  if (phaseDuration <= 0) return `${base}.0`;
  const clamped = Math.min(phaseDuration, Math.max(0, phaseRemaining));
  const completed = 1 - clamped / phaseDuration;
  const decimal = Math.min(9, Math.max(0, Math.floor(completed * 10)));
  return `${base}.${decimal}`;
}

function toRoomSettingsPayload(roomId: string, settings: Settings) {
  const preset1 = settings.presets[0];
  const preset2 = settings.presets[1];
  const preset3 = settings.presets[2];

  return {
    room_id: roomId,
    p12: preset1.timings?.p12 ?? 15,
    p23: preset1.timings?.p23 ?? 11,
    p34: preset1.timings?.p34 ?? 7,
    p4on: preset1.timings?.p4on ?? 3,
    preset1_name: preset1.name || "Preset 1",
    preset2_name: preset2.name || null,
    preset2_p12: preset2.timings?.p12 ?? null,
    preset2_p23: preset2.timings?.p23 ?? null,
    preset2_p34: preset2.timings?.p34 ?? null,
    preset2_p4on: preset2.timings?.p4on ?? null,
    preset3_name: preset3.name || null,
    preset3_p12: preset3.timings?.p12 ?? null,
    preset3_p23: preset3.timings?.p23 ?? null,
    preset3_p34: preset3.timings?.p34 ?? null,
    preset3_p4on: preset3.timings?.p4on ?? null,
    sound_volume: settings.soundVolume,
    sound_muted: settings.soundMuted,
  };
}

function getMapBadgeClass(mapLv: number): string {
  const palette = [
    "border-cyan-400 text-cyan-200",
    "border-emerald-400 text-emerald-200",
    "border-violet-400 text-violet-200",
    "border-amber-400 text-amber-200",
    "border-pink-400 text-pink-200",
    "border-orange-400 text-orange-200",
  ];
  return palette[Math.abs(mapLv) % palette.length];
}

async function ensureAudioContextReady(
  audioContextRef: MutableRefObject<AudioContext | null>,
): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  const audioContextClass = window.AudioContext;
  if (!audioContextClass) return null;
  if (!audioContextRef.current) {
    audioContextRef.current = new audioContextClass();
  }
  if (audioContextRef.current.state === "suspended") {
    try {
      await audioContextRef.current.resume();
    } catch {
      return null;
    }
  }
  return audioContextRef.current;
}

async function playTimeoutSound(
  audioContextRef: MutableRefObject<AudioContext | null>,
  volumePercent: number,
  muted: boolean,
  expiredCount: number,
): Promise<void> {
  if (muted || volumePercent <= 0 || typeof window === "undefined") return;
  const audioCtx = await ensureAudioContextReady(audioContextRef);
  if (!audioCtx) return;

  try {
    const count = Math.min(Math.max(expiredCount, 1), 3);
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = Math.min(1, volumePercent / 100) * 0.12;
    gainNode.connect(audioCtx.destination);

    const startAt = audioCtx.currentTime;
    for (let i = 0; i < count; i += 1) {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, startAt + i * 0.18);
      osc.connect(gainNode);
      osc.start(startAt + i * 0.18);
      osc.stop(startAt + i * 0.18 + 0.12);
    }
  } catch {
    // Ignore devices or browsers that block programmatic audio.
  }
}

function isValidLvCh(mapLv: number, ch: number): boolean {
  return Number.isInteger(mapLv) && Number.isInteger(ch) && mapLv >= 10 && mapLv <= 190 && ch >= 1 && ch <= 30;
}

function parseQuickCommand(
  command: string,
  settings: Settings,
): {
  mapLv: number;
  ch: number;
  phase: Tracker["phase"];
  noEventMinutes: number;
  presetSlot: 1 | 2 | 3;
  totalMinutesOverride?: number;
} | null {
  const parts = command.trim().split(/\s+/);
  if (parts.length !== 3 && parts.length !== 4) return null;

  const mapLv = Number(parts[0]);
  const ch = Number(parts[1]);
  if (!isValidLvCh(mapLv, ch)) return null;
  const parsedPresetSlot = parsePresetSlot(parts[3]);
  if (parts.length === 4 && parsedPresetSlot === null) return null;
  const presetSlot = parsedPresetSlot ?? 1;
  const presetTimings = getPresetTimings(settings, presetSlot);
  if (!presetTimings) return null;

  const last = parts[2];
  const numericLast = Number(last);
  if (!Number.isNaN(numericLast)) {
    if (Number.isInteger(numericLast) && numericLast >= 1 && numericLast <= 4) {
      return {
        mapLv,
        ch,
        phase: String(numericLast) as Tracker["phase"],
        noEventMinutes: 0,
        presetSlot,
      };
    }

    if (numericLast >= 1 && numericLast < 5) {
      const phaseFloor = Math.floor(numericLast);
      const fractional = numericLast - phaseFloor;
      const totalOverride = calculateDecimalPhaseRemainingMinutes(
        phaseFloor as 1 | 2 | 3 | 4,
        fractional,
        presetTimings,
      );
      return {
        mapLv,
        ch,
        phase: String(phaseFloor) as Tracker["phase"],
        noEventMinutes: 0,
        presetSlot,
        totalMinutesOverride: totalOverride,
      };
    }
    return null;
  }

  if (/^:\d{1,2}$/.test(last)) {
    const minuteOnly = Number(last.slice(1));
    if (Number.isNaN(minuteOnly) || minuteOnly < 0 || minuteOnly > 59) return null;
    return { mapLv, ch, phase: "No event", noEventMinutes: minuteOnly, presetSlot };
  }

  const parsedDuration = parseDurationToMinutes(last);
  if (parsedDuration !== null) {
    return { mapLv, ch, phase: "No event", noEventMinutes: parsedDuration, presetSlot };
  }

  return null;
}

function calculateDecimalPhaseRemainingMinutes(
  phaseFloor: 1 | 2 | 3 | 4,
  fractional: number,
  timings: PhaseTimings,
): number {
  const phaseDurations: Record<1 | 2 | 3 | 4, number> = {
    1: timings.p12,
    2: timings.p23,
    3: timings.p34,
    4: timings.p4on,
  };

  let total = 0;
  const currentPhaseRemaining = phaseDurations[phaseFloor] * (1 - fractional);
  total += currentPhaseRemaining;

  for (let nextPhase = (phaseFloor + 1) as 2 | 3 | 4 | 5; nextPhase <= 4; nextPhase += 1) {
    total += phaseDurations[nextPhase as 1 | 2 | 3 | 4];
  }

  return Math.max(0, total);
}

function parseFlexibleDuration(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;

  if (/^:\d{1,2}$/.test(raw)) {
    const mins = Number(raw.slice(1));
    if (Number.isNaN(mins) || mins < 0 || mins > 59) return null;
    return mins;
  }

  return parseDurationToMinutes(raw);
}

function parseCustomCountdownCommand(
  command: string,
): { mapLv: number; ch: number; countdownMinutes: number; presetSlot: 1 | 2 | 3 | null } | null {
  const parts = command.trim().split(/\s+/);
  if (parts.length !== 3 && parts.length !== 4) return null;

  const mapLv = Number(parts[0]);
  const ch = Number(parts[1]);
  if (!isValidLvCh(mapLv, ch)) return null;

  const countdownMinutes = parseFlexibleDuration(parts[2]);
  if (countdownMinutes === null) return null;
  const presetSlot = parsePresetSlot(parts[3]);
  if (parts.length === 4 && presetSlot === null) return null;

  return { mapLv, ch, countdownMinutes, presetSlot };
}

function parsePresetSlot(raw: string | undefined): 1 | 2 | 3 | null {
  if (!raw) return null;
  const numeric = Number(raw);
  if (numeric === 1 || numeric === 2 || numeric === 3) return numeric;
  return null;
}
