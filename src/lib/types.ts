export type Phase = "No event" | "1" | "2" | "3" | "4";

export type PhaseTimings = {
  p12: number;
  p23: number;
  p34: number;
  p4on: number;
};

export type Preset = {
  name: string;
  timings: PhaseTimings | null;
};

export type Settings = {
  presets: [Preset, Preset, Preset];
  soundVolume: number;
  soundMuted: boolean;
};

export type Tracker = {
  id: string;
  roomId: string;
  mapLv: number;
  ch: number;
  phase: Phase;
  noEventMinutes: number;
  presetSlot: 1 | 2 | 3 | null;
  isCustomTime: boolean;
  targetAt: string;
  createdAt: string;
};

export type Room = {
  id: string;
  code: string;
  name: string | null;
  createdAt: string;
};

export type DbRoom = {
  id: string;
  code: string;
  name: string | null;
  created_at: string;
};

export type DbTracker = {
  id: string;
  room_id: string;
  map_lv: number;
  ch: number;
  phase: Phase;
  no_event_minutes: number;
  preset_slot: 1 | 2 | 3 | null;
  is_custom_time: boolean | null;
  target_at: string;
  created_at: string;
};

export type DbRoomSettings = {
  room_id: string;
  p12: number;
  p23: number;
  p34: number;
  p4on: number;
  preset1_name: string;
  preset2_name: string | null;
  preset2_p12: number | null;
  preset2_p23: number | null;
  preset2_p34: number | null;
  preset2_p4on: number | null;
  preset3_name: string | null;
  preset3_p12: number | null;
  preset3_p23: number | null;
  preset3_p34: number | null;
  preset3_p4on: number | null;
  sound_volume: number;
  sound_muted: boolean;
  updated_at: string;
};
