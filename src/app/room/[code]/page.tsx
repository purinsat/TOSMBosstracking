"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MutableRefObject,
} from "react";

import {
  DEFAULT_SETTINGS,
  PHASES,
  formatDurationInput,
  formatMinutesSeconds,
  getColorClasses,
  getDynamicPhaseDisplay,
  getTotalMinutes,
  parseDurationToMinutes,
} from "@/lib/countdown";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DbRoom, DbRoomSettings, DbTracker, Room, Settings, Tracker } from "@/lib/types";

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

  const [selectedPhase, setSelectedPhase] = useState<Tracker["phase"]>("No event");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sortMode, setSortMode] = useState<"time" | "channel">("time");
  const [mapLvInput, setMapLvInput] = useState("");
  const [chInput, setChInput] = useState("");
  const [noEventTimeInput, setNoEventTimeInput] = useState("");
  const [quickCommandInput, setQuickCommandInput] = useState("");
  const [draftSettings, setDraftSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fiveMinuteAlertedTrackerIdsRef = useRef<Set<string>>(new Set());

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

      const [settingsResponse, trackersResponse] = await Promise.all([
        supabase
          .from("room_settings")
          .select("room_id, p12, p23, p34, p4on, sound_volume, sound_muted, updated_at")
          .eq("room_id", mappedRoom.id)
          .single<DbRoomSettings>(),
        supabase
          .from("trackers")
          .select("id, room_id, map_lv, ch, phase, no_event_minutes, target_at, created_at")
          .eq("room_id", mappedRoom.id)
          .gt("target_at", nowIso)
          .order("target_at", { ascending: true })
          .returns<DbTracker[]>(),
      ]);

      if (!active) return;

      if (settingsResponse.error) {
        setError(settingsResponse.error.message);
      } else {
        const nextSettings = mapSettings(settingsResponse.data);
        setSettings(nextSettings);
        setDraftSettings(nextSettings);
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
  }, [roomCode, supabase]);

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
            .select("id, room_id, map_lv, ch, phase, no_event_minutes, target_at, created_at")
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
          const { data } = await supabase
            .from("room_settings")
            .select("room_id, p12, p23, p34, p4on, sound_volume, sound_muted, updated_at")
            .eq("room_id", room.id)
            .single<DbRoomSettings>();
          if (data) {
            const nextSettings = mapSettings(data);
            setSettings(nextSettings);
            setDraftSettings(nextSettings);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room?.id, supabase]);

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
          .select("id, room_id, map_lv, ch, phase, no_event_minutes, target_at, created_at")
          .eq("room_id", room.id)
          .gt("target_at", nowIso)
          .order("target_at", { ascending: true })
          .returns<DbTracker[]>(),
        supabase
          .from("room_settings")
          .select("room_id, p12, p23, p34, p4on, sound_volume, sound_muted, updated_at")
          .eq("room_id", room.id)
          .single<DbRoomSettings>(),
      ]);

      if (!trackersResponse.error && trackersResponse.data) {
        setTrackers(trackersResponse.data.map(mapTracker));
      }

      if (!settingsResponse.error && settingsResponse.data) {
        const nextSettings = mapSettings(settingsResponse.data);
        setSettings(nextSettings);
        setDraftSettings(nextSettings);
      }
    }, 4000);

    return () => window.clearInterval(poll);
  }, [room?.id, supabase]);

  const sortedRows = useMemo(() => {
    const rows = [...trackers]
      .map((tracker) => {
        const remainingSeconds = Math.max(
          0,
          Math.floor((new Date(tracker.targetAt).getTime() - nowMs) / 1000),
        );
        const displayPhase = getDynamicPhaseDisplay(
          tracker.phase,
          remainingSeconds,
          settings,
          tracker.noEventMinutes,
        );
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
    setMapLvInput("");
    setChInput("");
    setNoEventTimeInput("");
    setQuickCommandInput("");
    setSelectedPhase("No event");
    setShowAddModal(true);
  }

  async function submitAddForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!room?.id) return;

    let mapLv = 0;
    let ch = 0;
    let phase: Tracker["phase"] = selectedPhase;
    let noEventMinutes = 0;

    if (quickCommandInput.trim()) {
      const parsed = parseQuickCommand(quickCommandInput);
      if (!parsed) {
        window.alert(
          "Quick command invalid. Example: '103 12 3' or '103 13 04:32' or '103 13 :5'.",
        );
        return;
      }
      mapLv = parsed.mapLv;
      ch = parsed.ch;
      phase = parsed.phase;
      noEventMinutes = parsed.noEventMinutes;
    } else {
      mapLv = Number(mapLvInput);
      ch = Number(chInput);
      if (!isValidLvCh(mapLv, ch)) {
        window.alert("Please enter valid values: Lv 10-190 and Ch 1-30.");
        return;
      }

      if (selectedPhase === "No event") {
        if (!noEventTimeInput) {
          window.alert("Please enter No event duration (example: 14 or 1:14).");
          return;
        }
        const parsedDuration = parseDurationToMinutes(noEventTimeInput);
        if (parsedDuration === null) {
          window.alert("Invalid format. Use minutes (14) or H:MM (1:14).");
          return;
        }
        noEventMinutes = parsedDuration;
      }
    }

    const totalMinutes = getTotalMinutes(phase, settings, noEventMinutes);
    const now = Date.now();
    const optimistic: Tracker = {
      id: `tmp_${now}`,
      roomId: room.id,
      mapLv,
      ch,
      phase,
      noEventMinutes,
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
        target_at: optimistic.targetAt,
      })
      .select("id, room_id, map_lv, ch, phase, no_event_minutes, target_at, created_at")
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

  async function saveSettings() {
    if (!room?.id || savingSettings) return;
    setSavingSettings(true);
    setError("");

    const previous = settings;
    setSettings(draftSettings);

    const { error: updateError } = await supabase
      .from("room_settings")
      .update({
        p12: draftSettings.p12,
        p23: draftSettings.p23,
        p34: draftSettings.p34,
        p4on: draftSettings.p4on,
      })
      .eq("room_id", room.id);

    if (updateError) {
      setSettings(previous);
      setDraftSettings(previous);
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
      .update({
        sound_volume: merged.soundVolume,
        sound_muted: merged.soundMuted,
      })
      .eq("room_id", room.id);

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

  function updateDraftNumber(key: "p12" | "p23" | "p34" | "p4on", value: string) {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 0) return;
    setDraftSettings((prev) => ({ ...prev, [key]: numeric }));
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
              onClick={() => setShowSettingsModal(true)}
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
                    <span className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-base font-semibold uppercase tracking-wide text-slate-200">
                      Lv.{tracker.mapLv}
                    </span>
                    <span className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-base font-semibold uppercase tracking-wide text-slate-200">
                      Ch.{tracker.ch}
                    </span>
                    <span className="rounded-full border border-slate-600 bg-slate-900 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      {displayPhase}
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
                  Quick command (optional)
                </label>
                <input
                  type="text"
                  value={quickCommandInput}
                  onChange={(e) => setQuickCommandInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                  placeholder="103 12 3 or 103 13 04:32 or 103 13 :5"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Format: Lv Ch Last. Lv 10-190, Ch 1-30, Last=1-4 phase, H:MM no-event, :X/:XX
                  minute no-event.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Map / Lv (example: 101, 103, 89, 82)
                </label>
                <input
                  type="number"
                  value={mapLvInput}
                  onChange={(e) => setMapLvInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                    min={10}
                    max={190}
                  required={!quickCommandInput.trim()}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Channel (1-30)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={chInput}
                  onChange={(e) => setChInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                  required={!quickCommandInput.trim()}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-slate-300">Phase</p>
                <div className="grid grid-cols-5 gap-2">
                  {PHASES.map((phase) => (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setSelectedPhase(phase)}
                      className={`rounded-lg border px-2 py-2 text-sm ${
                        selectedPhase === phase
                          ? "border-sky-400 text-sky-300"
                          : "border-slate-700 text-slate-200"
                      }`}
                    >
                      {phase}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPhase === "No event" && (
                <div>
                  <label className="mb-1 block text-sm text-slate-300">
                    No event duration (MM or H:MM)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="01:24"
                    value={noEventTimeInput}
                    onChange={(e) => setNoEventTimeInput(e.target.value)}
                    onBlur={(e) =>
                      setNoEventTimeInput(
                        formatDurationInput(e.target.value) ?? e.target.value.trim(),
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                    required={selectedPhase === "No event" && !quickCommandInput.trim()}
                  />
                </div>
              )}

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
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="mb-4 text-xl font-bold">Phase Settings (Minutes)</h2>
            <div className="space-y-3">
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block">Phase 1 -{">"} 2</span>
                <input
                  type="number"
                  min={0}
                  value={draftSettings.p12}
                  onChange={(e) => updateDraftNumber("p12", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block">Phase 2 -{">"} 3</span>
                <input
                  type="number"
                  min={0}
                  value={draftSettings.p23}
                  onChange={(e) => updateDraftNumber("p23", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block">Phase 3 -{">"} 4</span>
                <input
                  type="number"
                  min={0}
                  value={draftSettings.p34}
                  onChange={(e) => updateDraftNumber("p34", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block">Phase 4 -{">"} On (spawn)</span>
                <input
                  type="number"
                  min={0}
                  value={draftSettings.p4on}
                  onChange={(e) => updateDraftNumber("p4on", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-700 px-4 py-2"
                onClick={() => {
                  setDraftSettings(settings);
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
    p12: settings.p12,
    p23: settings.p23,
    p34: settings.p34,
    p4on: settings.p4on,
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
    targetAt: row.target_at,
    createdAt: row.created_at,
  };
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
): { mapLv: number; ch: number; phase: Tracker["phase"]; noEventMinutes: number } | null {
  const parts = command.trim().split(/\s+/);
  if (parts.length !== 3) return null;

  const mapLv = Number(parts[0]);
  const ch = Number(parts[1]);
  if (!isValidLvCh(mapLv, ch)) return null;

  const last = parts[2];
  if (/^[1-4]$/.test(last)) {
    return { mapLv, ch, phase: last as Tracker["phase"], noEventMinutes: 0 };
  }

  if (/^:\d{1,2}$/.test(last)) {
    const minuteOnly = Number(last.slice(1));
    if (Number.isNaN(minuteOnly) || minuteOnly < 0 || minuteOnly > 59) return null;
    return { mapLv, ch, phase: "No event", noEventMinutes: minuteOnly };
  }

  const parsedDuration = parseDurationToMinutes(last);
  if (parsedDuration !== null) {
    return { mapLv, ch, phase: "No event", noEventMinutes: parsedDuration };
  }

  return null;
}
