"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DEFAULT_SETTINGS } from "@/lib/countdown";
import {
  ROOM_SETTINGS_SELECT,
  mapSettings,
  toRoomSettingsPayload,
} from "@/lib/mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DbRoomSettings, Settings } from "@/lib/types";

export type UseRoomSettingsResult = {
  settings: Settings;
  error: string;
  saving: boolean;
  saveSettings: (next: Settings) => Promise<boolean>;
  updateSoundSettings: (patch: Partial<Pick<Settings, "soundMuted" | "soundVolume">>) => Promise<void>;
};

export function useRoomSettings(roomId: string | null): UseRoomSettingsResult {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrCreate = useCallback(
    async (id: string): Promise<Settings | null> => {
      const { data, error: readError } = await supabase
        .from("room_settings")
        .select(ROOM_SETTINGS_SELECT)
        .eq("room_id", id)
        .maybeSingle<DbRoomSettings>();

      if (readError) {
        setError(readError.message);
        return null;
      }
      if (data) return mapSettings(data);

      const { data: created, error: createError } = await supabase
        .from("room_settings")
        .upsert(toRoomSettingsPayload(id, DEFAULT_SETTINGS), { onConflict: "room_id" })
        .select(ROOM_SETTINGS_SELECT)
        .single<DbRoomSettings>();

      if (createError) {
        setError(createError.message);
        return null;
      }
      return mapSettings(created);
    },
    [supabase],
  );

  useEffect(() => {
    if (!roomId) return;
    let active = true;

    async function load() {
      if (!roomId) return;
      const next = await fetchOrCreate(roomId);
      if (!active) return;
      if (next) setSettings(next);
    }
    void load();

    const channel = supabase
      .channel(`room-settings-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_settings",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          if (!roomId) return;
          const next = await fetchOrCreate(roomId);
          if (active && next) setSettings(next);
        },
      )
      .subscribe();

    const poll = window.setInterval(async () => {
      if (!roomId) return;
      const { data, error: readError } = await supabase
        .from("room_settings")
        .select(ROOM_SETTINGS_SELECT)
        .eq("room_id", roomId)
        .maybeSingle<DbRoomSettings>();
      if (!active) return;
      if (readError) return;
      if (data) setSettings(mapSettings(data));
    }, 8000);

    return () => {
      active = false;
      void supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [roomId, supabase, fetchOrCreate]);

  const saveSettings = useCallback<UseRoomSettingsResult["saveSettings"]>(
    async (next) => {
      if (!roomId || saving) return false;
      setSaving(true);
      setError("");
      const previous = settings;
      setSettings(next);

      const { error: updateError } = await supabase
        .from("room_settings")
        .upsert(toRoomSettingsPayload(roomId, next), { onConflict: "room_id" })
        .select("room_id")
        .single()
        .then(({ error }) => ({ error }));

      setSaving(false);
      if (updateError) {
        setSettings(previous);
        setError(updateError.message);
        return false;
      }
      return true;
    },
    [roomId, saving, settings, supabase],
  );

  const updateSoundSettings = useCallback<UseRoomSettingsResult["updateSoundSettings"]>(
    async (patch) => {
      if (!roomId) return;
      const previous = settings;
      const merged = { ...settings, ...patch };
      setSettings(merged);
      setError("");

      const { error: updateError } = await supabase
        .from("room_settings")
        .upsert(toRoomSettingsPayload(roomId, merged), { onConflict: "room_id" })
        .select("room_id")
        .single()
        .then(({ error }) => ({ error }));

      if (updateError) {
        setSettings(previous);
        setError(updateError.message);
      }
    },
    [roomId, settings, supabase],
  );

  return { settings, error, saving, saveSettings, updateSoundSettings };
}
