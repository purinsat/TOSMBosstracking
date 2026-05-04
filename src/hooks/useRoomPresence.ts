"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function generateClientId(): string {
  return `hunter_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Subscribes to a Supabase Realtime presence channel for the given room and
 * returns the current count of unique clients (including this one).
 * Returns 0 while not connected or when roomId is null.
 */
export function useRoomPresence(roomId: string | null): number {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const clientIdRef = useRef<string>(generateClientId());
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!roomId) return;
    const clientId = clientIdRef.current;
    const channel = supabase.channel(`presence-${roomId}`, {
      config: { presence: { key: clientId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ joined_at: Date.now() });
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  return count;
}
