"use client";

import { useEffect, useMemo, useState } from "react";

import { mapRoom } from "@/lib/mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DbRoom, Room } from "@/lib/types";

export type UseRoomResult = {
  room: Room | null;
  loading: boolean;
  error: string;
};

export function useRoom(roomCode: string): UseRoomResult {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(() => Boolean(roomCode));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roomCode) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      const { data, error: readError } = await supabase
        .from("rooms")
        .select("id, code, name, created_at")
        .eq("code", roomCode)
        .maybeSingle<DbRoom>();

      if (!active) return;
      if (readError) {
        setError(readError.message);
        setLoading(false);
        return;
      }
      if (!data) {
        setError("Room not found.");
        setLoading(false);
        return;
      }
      setRoom(mapRoom(data));
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [roomCode, supabase]);

  return { room, loading, error };
}
