export type Phase = "No event" | "1" | "2" | "3" | "4";

export type Settings = {
  p12: number;
  p23: number;
  p34: number;
  p4on: number;
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
  target_at: string;
  created_at: string;
};

export type DbRoomSettings = {
  room_id: string;
  p12: number;
  p23: number;
  p34: number;
  p4on: number;
  sound_volume: number;
  sound_muted: boolean;
  updated_at: string;
};
