"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TRACKERS_SELECT, mapTracker } from "@/lib/mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DbTracker, Tracker } from "@/lib/types";

export type NewTrackerInput = {
  roomId: string;
  mapLv: number;
  ch: number;
  phase: Tracker["phase"];
  noEventMinutes: number;
  presetSlot: 1 | 2 | 3 | null;
  isCustomTime: boolean;
  targetAt: string;
};

export type UseTrackersResult = {
  trackers: Tracker[];
  error: string;
  /** IDs of trackers recently inserted by other clients. Auto-expires. */
  flashedTrackerIds: Set<string>;
  addTracker: (input: NewTrackerInput) => Promise<Tracker | null>;
  removeTracker: (id: string) => Promise<void>;
  setCustomTrackerTime: (id: string, minutes: number) => Promise<boolean>;
  removeExpiredLocally: (ids: string[]) => void;
};

const FLASH_MS = 3500;

export function useTrackers(roomId: string | null): UseTrackersResult {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [error, setError] = useState("");
  const [flashedTrackerIds, setFlashedTrackerIds] = useState<Set<string>>(() => new Set());

  const knownIdsRef = useRef<Set<string>>(new Set());
  const selfInsertedIdsRef = useRef<Set<string>>(new Set());
  const flashTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const isFirstLoadRef = useRef(true);

  const clearFlash = useCallback((id: string) => {
    setFlashedTrackerIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const handle = flashTimeoutsRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      flashTimeoutsRef.current.delete(id);
    }
  }, []);

  const flashId = useCallback(
    (id: string) => {
      setFlashedTrackerIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      const existing = flashTimeoutsRef.current.get(id);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(() => clearFlash(id), FLASH_MS);
      flashTimeoutsRef.current.set(id, handle);
    },
    [clearFlash],
  );

  const ingest = useCallback(
    (next: Tracker[]) => {
      const nextIds = new Set(next.map((tracker) => tracker.id));
      const knownIds = knownIdsRef.current;
      const selfInserted = selfInsertedIdsRef.current;

      if (!isFirstLoadRef.current) {
        for (const id of nextIds) {
          if (knownIds.has(id)) continue;
          if (selfInserted.has(id)) {
            selfInserted.delete(id);
            continue;
          }
          flashId(id);
        }
      } else {
        isFirstLoadRef.current = false;
      }

      for (const id of knownIds) {
        if (!nextIds.has(id)) clearFlash(id);
      }

      knownIdsRef.current = nextIds;
      setTrackers(next);
    },
    [flashId, clearFlash],
  );

  const fetchTrackers = useCallback(
    async (id: string) => {
      const nowIso = new Date().toISOString();
      const { data, error: readError } = await supabase
        .from("trackers")
        .select(TRACKERS_SELECT)
        .eq("room_id", id)
        .gt("target_at", nowIso)
        .order("target_at", { ascending: true })
        .returns<DbTracker[]>();

      if (readError) {
        setError(readError.message);
        return;
      }
      ingest((data ?? []).map(mapTracker));
    },
    [supabase, ingest],
  );

  useEffect(() => {
    if (!roomId) return;
    let active = true;

    async function load() {
      if (!roomId) return;
      const nowIso = new Date().toISOString();
      await supabase
        .from("trackers")
        .delete()
        .eq("room_id", roomId)
        .lte("target_at", nowIso);
      if (!active) return;
      await fetchTrackers(roomId);
    }

    isFirstLoadRef.current = true;
    void load();

    const channel = supabase
      .channel(`trackers-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trackers",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          if (!roomId) return;
          await fetchTrackers(roomId);
        },
      )
      .subscribe();

    const poll = window.setInterval(() => {
      if (!roomId) return;
      void fetchTrackers(roomId);
    }, 6000);

    return () => {
      active = false;
      void supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [roomId, supabase, fetchTrackers]);

  useEffect(() => {
    const timeouts = flashTimeoutsRef.current;
    return () => {
      for (const handle of timeouts.values()) clearTimeout(handle);
      timeouts.clear();
    };
  }, []);

  const addTracker = useCallback<UseTrackersResult["addTracker"]>(
    async (input) => {
      if (!roomId) return null;
      const optimisticId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: Tracker = {
        id: optimisticId,
        roomId: input.roomId,
        mapLv: input.mapLv,
        ch: input.ch,
        phase: input.phase,
        noEventMinutes: input.noEventMinutes,
        presetSlot: input.presetSlot,
        isCustomTime: input.isCustomTime,
        targetAt: input.targetAt,
        createdAt: new Date().toISOString(),
      };

      setTrackers((prev) => [...prev, optimistic]);
      knownIdsRef.current.add(optimisticId);

      const { data, error: insertError } = await supabase
        .from("trackers")
        .insert({
          room_id: input.roomId,
          map_lv: input.mapLv,
          ch: input.ch,
          phase: input.phase,
          no_event_minutes: input.noEventMinutes,
          preset_slot: input.presetSlot,
          is_custom_time: input.isCustomTime,
          target_at: input.targetAt,
        })
        .select(TRACKERS_SELECT)
        .single<DbTracker>();

      if (insertError || !data) {
        setTrackers((prev) => prev.filter((item) => item.id !== optimisticId));
        knownIdsRef.current.delete(optimisticId);
        setError(insertError?.message ?? "Failed to add tracker.");
        return null;
      }

      const inserted = mapTracker(data);
      selfInsertedIdsRef.current.add(inserted.id);
      knownIdsRef.current.delete(optimisticId);
      knownIdsRef.current.add(inserted.id);
      setTrackers((prev) =>
        prev.map((item) => (item.id === optimisticId ? inserted : item)),
      );
      return inserted;
    },
    [roomId, supabase],
  );

  const removeTracker = useCallback<UseTrackersResult["removeTracker"]>(
    async (id) => {
      if (!roomId) return;
      const snapshot = trackers;
      clearFlash(id);
      setTrackers((prev) => prev.filter((item) => item.id !== id));
      knownIdsRef.current.delete(id);

      const { error: deleteError } = await supabase
        .from("trackers")
        .delete()
        .eq("room_id", roomId)
        .eq("id", id);

      if (deleteError) {
        setTrackers(snapshot);
        knownIdsRef.current = new Set(snapshot.map((item) => item.id));
        setError(deleteError.message);
      }
    },
    [roomId, trackers, supabase, clearFlash],
  );

  const setCustomTrackerTime = useCallback<UseTrackersResult["setCustomTrackerTime"]>(
    async (id, minutes) => {
      if (!roomId) return false;
      const nextTargetAt = new Date(Date.now() + minutes * 60000).toISOString();
      const snapshot = trackers;
      setTrackers((prev) =>
        prev.map((item) => (item.id === id ? { ...item, targetAt: nextTargetAt } : item)),
      );

      const { error: updateError } = await supabase
        .from("trackers")
        .update({ target_at: nextTargetAt })
        .eq("room_id", roomId)
        .eq("id", id);

      if (updateError) {
        setTrackers(snapshot);
        setError(updateError.message);
        return false;
      }
      return true;
    },
    [roomId, trackers, supabase],
  );

  const removeExpiredLocally = useCallback<UseTrackersResult["removeExpiredLocally"]>(
    (ids) => {
      if (ids.length === 0) return;
      for (const id of ids) {
        clearFlash(id);
        knownIdsRef.current.delete(id);
      }
      setTrackers((prev) => prev.filter((item) => !ids.includes(item.id)));
      if (roomId) {
        void supabase.from("trackers").delete().eq("room_id", roomId).in("id", ids);
      }
    },
    [roomId, supabase, clearFlash],
  );

  return {
    trackers,
    error,
    flashedTrackerIds,
    addTracker,
    removeTracker,
    setCustomTrackerTime,
    removeExpiredLocally,
  };
}
