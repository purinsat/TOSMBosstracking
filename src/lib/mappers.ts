import { DEFAULT_SETTINGS } from "@/lib/countdown";
import type {
  DbRoom,
  DbRoomSettings,
  DbTracker,
  PhaseTimings,
  Room,
  Settings,
  Tracker,
} from "@/lib/types";

export type PresetTimingInputs = {
  p12: string;
  p23: string;
  p34: string;
  p4on: string;
};

export const ROOM_SETTINGS_SELECT =
  "room_id, p12, p23, p34, p4on, preset1_name, preset2_name, preset2_p12, preset2_p23, preset2_p34, preset2_p4on, preset3_name, preset3_p12, preset3_p23, preset3_p34, preset3_p4on, sound_volume, sound_muted, updated_at";

export const TRACKERS_SELECT =
  "id, room_id, map_lv, ch, phase, no_event_minutes, preset_slot, is_custom_time, target_at, created_at, kind, phase_decimal";

export function mapRoom(row: DbRoom): Room {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function mapTracker(row: DbTracker): Tracker {
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
    kind: row.kind ?? "preset",
    phaseDecimal: row.phase_decimal ?? null,
  };
}

export function mapSettings(row: DbRoomSettings): Settings {
  return {
    presets: [
      {
        name: row.preset1_name || "Preset 1",
        timings: {
          p12: row.p12,
          p23: row.p23,
          p34: row.p34,
          p4on: row.p4on,
        },
      },
      {
        name: row.preset2_name || "Preset 2",
        timings: isCompleteTimingSet(row.preset2_p12, row.preset2_p23, row.preset2_p34, row.preset2_p4on)
          ? {
              p12: row.preset2_p12!,
              p23: row.preset2_p23!,
              p34: row.preset2_p34!,
              p4on: row.preset2_p4on!,
            }
          : null,
      },
      {
        name: row.preset3_name || "Preset 3",
        timings: isCompleteTimingSet(row.preset3_p12, row.preset3_p23, row.preset3_p34, row.preset3_p4on)
          ? {
              p12: row.preset3_p12!,
              p23: row.preset3_p23!,
              p34: row.preset3_p34!,
              p4on: row.preset3_p4on!,
            }
          : null,
      },
    ],
    soundVolume: row.sound_volume,
    soundMuted: row.sound_muted,
  };
}

export function isCompleteTimingSet(
  p12: number | null,
  p23: number | null,
  p34: number | null,
  p4on: number | null,
): boolean {
  return p12 !== null && p23 !== null && p34 !== null && p4on !== null;
}

export function getPresetTimings(
  settings: Settings,
  presetSlot: 1 | 2 | 3,
): PhaseTimings | null {
  return settings.presets[presetSlot - 1]?.timings ?? null;
}

export function toRoomSettingsPayload(roomId: string, settings: Settings) {
  const [preset1, preset2, preset3] = settings.presets;
  const p1 = preset1.timings ?? DEFAULT_SETTINGS.presets[0].timings!;

  return {
    room_id: roomId,
    p12: p1.p12 ?? 15,
    p23: p1.p23 ?? 11,
    p34: p1.p34 ?? 7,
    p4on: p1.p4on ?? 3,
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

export function toPresetTimingInputs(
  settings: Settings,
): [PresetTimingInputs, PresetTimingInputs, PresetTimingInputs] {
  return settings.presets.map((preset) => ({
    p12: preset.timings?.p12 != null ? String(preset.timings.p12) : "",
    p23: preset.timings?.p23 != null ? String(preset.timings.p23) : "",
    p34: preset.timings?.p34 != null ? String(preset.timings.p34) : "",
    p4on: preset.timings?.p4on != null ? String(preset.timings.p4on) : "",
  })) as [PresetTimingInputs, PresetTimingInputs, PresetTimingInputs];
}

export function applyPresetInputsToSettings(
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

export function parsePresetInputValue(raw: string): number {
  if (raw.trim() === "") return 0;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
}

export function defaultRoomSettingsPayload(roomId: string) {
  return toRoomSettingsPayload(roomId, DEFAULT_SETTINGS);
}
