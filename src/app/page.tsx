"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DEFAULT_SETTINGS } from "@/lib/countdown";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<null | "create" | "join">(null);
  const [error, setError] = useState("");

  async function createRoom() {
    if (loading) return;
    setError("");
    setLoading("create");

    try {
      const code = await generateUniqueRoomCode(supabase);
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert({
          code,
          name: roomName.trim() ? roomName.trim() : null,
        })
        .select("id, code")
        .single();

      if (roomError || !roomData) {
        throw new Error(roomError?.message ?? "Unable to create room.");
      }

      const { error: settingsError } = await supabase.from("room_settings").insert({
        room_id: roomData.id,
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
      });

      if (settingsError) throw new Error(settingsError.message);

      router.push(`/room/${roomData.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setLoading(null);
    }
  }

  async function joinRoom() {
    if (loading) return;
    setError("");
    const normalizedCode = joinCode.trim().toUpperCase();
    if (!normalizedCode) {
      setError("Please enter a room code.");
      return;
    }

    setLoading("join");
    try {
      const { data, error: joinError } = await supabase
        .from("rooms")
        .select("code")
        .eq("code", normalizedCode)
        .maybeSingle();

      if (joinError) throw new Error(joinError.message);
      if (!data) {
        setError("Room not found. Check the room code.");
        return;
      }

      router.push(`/room/${normalizedCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <h1 className="text-center text-4xl font-bold tracking-wide">
          TOSM Boss Tracking By PonderingTH
        </h1>
        <p className="text-center text-base text-slate-300">
          Create a room to share timers, or join an existing room code.
        </p>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="text-xl font-semibold text-sky-300">Create Room</h2>
          <label className="mt-3 block text-base text-slate-200">
            Room Name (optional)
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-lg"
              placeholder="Guild Party A"
            />
          </label>
          <button
            type="button"
            onClick={createRoom}
            disabled={loading !== null}
            className="mt-3 w-full rounded-xl border border-sky-500 px-4 py-2 text-lg font-semibold text-sky-300 disabled:opacity-60"
          >
            {loading === "create" ? "Creating..." : "Create Room"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="text-xl font-semibold text-sky-300">Join Room</h2>
          <label className="mt-3 block text-base text-slate-200">
            Room Code
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-lg uppercase"
              placeholder="AB12CD"
            />
          </label>
          <button
            type="button"
            onClick={joinRoom}
            disabled={loading !== null}
            className="mt-3 w-full rounded-xl border border-sky-500 px-4 py-2 text-lg font-semibold text-sky-300 disabled:opacity-60"
          >
            {loading === "join" ? "Joining..." : "Join Room"}
          </button>
        </section>

        {error && (
          <p className="rounded-xl border border-rose-500/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <section className="mt-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-center">
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
    </main>
  );
}

async function generateUniqueRoomCode(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let candidate = "";
    for (let i = 0; i < 6; i += 1) {
      candidate += chars[Math.floor(Math.random() * chars.length)];
    }

    const { data, error } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
  }

  throw new Error("Could not generate room code. Please try again.");
}
