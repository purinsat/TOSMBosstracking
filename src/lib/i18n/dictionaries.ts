export type Locale = "en" | "th";

export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "th"] as const;

export type Dictionary = {
  "app.leave": string;
  "app.settings": string;
  "app.language": string;
  "app.whatsNew": string;

  "room.code": string;
  "room.name": string;
  "room.unnamed": string;

  "presence.online": string;

  "action.addBoss": string;
  "action.addBossShort": string;
  "action.cancel": string;
  "action.add": string;
  "action.adding": string;
  "action.save": string;
  "action.saving": string;
  "action.ok": string;
  "action.set": string;
  "action.clearFilters": string;

  "sort.byTime": string;
  "sort.byCh": string;

  "filter.label": string;
  "filter.allLv": string;
  "filter.allPresets": string;
  "filter.groupByMap": string;

  "tracker.remove": string;
  "tracker.setTime": string;
  "tracker.empty": string;
  "tracker.emptyFiltered": string;
  "tracker.new": string;
  "tracker.trackers": string;
  "tracker.tracker": string;

  "add.title": string;
  "add.quickLabel": string;
  "add.quickHint": string;
  "add.customLabel": string;
  "add.customHint": string;
  "add.errorEmpty": string;
  "add.errorQuickInvalid": string;
  "add.errorCustomInvalid": string;
  "add.errorPresetBlank": string;
  "add.success": string;
  "add.failure": string;

  "settings.title": string;
  "settings.presetName": string;
  "settings.phase12": string;
  "settings.phase23": string;
  "settings.phase34": string;
  "settings.phase4on": string;

  "setTime.title": string;
  "setTime.message": string;
  "setTime.invalid": string;
  "setTime.failure": string;

  "mute.tooltipMute": string;
  "mute.tooltipUnmute": string;
  "volume.aria": string;

  "promo.subscribe": string;
  "promo.support": string;
  "promo.thanks": string;

  "home.subtitle": string;
  "home.createRoom": string;
  "home.createRoomNameLabel": string;
  "home.createRoomNamePlaceholder": string;
  "home.creating": string;
  "home.joinRoom": string;
  "home.joining": string;
  "home.roomCode": string;
  "home.errorEmpty": string;
  "home.errorNotFound": string;

  "room.loading": string;
  "room.back": string;
  "room.notFound": string;

  "tab.main": string;
  "tab.hardcore": string;

  "hardcore.addPlaceholder": string;
  "hardcore.addHint": string;
  "hardcore.errorInvalid": string;
  "hardcore.empty": string;
  "hardcore.elapsed": string;
  "hardcore.countdown": string;
  "hardcore.bumpDecimal": string;
  "hardcore.sortBy": string;
  "hardcore.sort.time": string;
  "hardcore.sort.phase": string;
  "hardcore.hideCooldown": string;
  "hardcore.sortByTime": string;
  "hardcore.sortByPhase": string;
  "hardcore.sortByLv": string;
};

const en: Dictionary = {
  "app.leave": "Leave",
  "app.settings": "Settings",
  "app.language": "TH / EN",
  "app.whatsNew": "What’s New",

  "room.code": "Room Code",
  "room.name": "Room Name",
  "room.unnamed": "Unnamed Room",

  "presence.online": "{count} online",

  "action.addBoss": "Add Boss Tracking",
  "action.addBossShort": "Add Boss",
  "action.cancel": "Cancel",
  "action.add": "Add",
  "action.adding": "Adding...",
  "action.save": "Save",
  "action.saving": "Saving...",
  "action.ok": "OK",
  "action.set": "Set",
  "action.clearFilters": "Clear filters",

  "sort.byTime": "Sort by Time",
  "sort.byCh": "Sort by Ch",

  "filter.label": "Filter",
  "filter.allLv": "All Lv",
  "filter.allPresets": "All Presets",
  "filter.groupByMap": "Group by map",

  "tracker.remove": "Remove",
  "tracker.setTime": "Set Time",
  "tracker.empty": "No boss tracking yet. Tap + to add one.",
  "tracker.emptyFiltered": "No boss tracking matches your filters.",
  "tracker.new": "New",
  "tracker.trackers": "trackers",
  "tracker.tracker": "tracker",

  "add.title": "Add Boss Tracking",
  "add.quickLabel": "Quick command",
  "add.quickHint":
    "Quick: Lv Ch Last [Preset]. Example: 103 2 2.5 1. Last can be 1-4, decimal phase (2.5), H:MM, or :MM. Preset is optional (1-3), default is 1.",
  "add.customLabel": "Custom command (optional, bypass phase defaults)",
  "add.customHint":
    "Custom: Lv Ch Duration [Preset]. Example: 103 2 :30 2 or 103 2 :30. Duration sets the countdown directly. Preset is optional; without preset, phase shows N/A.",
  "add.errorEmpty": "Please enter either Quick command or Custom command.",
  "add.errorQuickInvalid":
    "Quick command invalid. Example: '103 12 3', '103 12 2.75 2', '103 13 04:32', or '103 13 :5 3'.",
  "add.errorCustomInvalid":
    "Custom command invalid. Use: '103 12 5', '103 12 2:12', '103 12 :5', or add preset: '103 12 :30 2'.",
  "add.errorPresetBlank": "Preset {slot} is blank. Please set timings in Settings first.",
  "add.success": "Tracker added.",
  "add.failure": "Failed to add tracker.",

  "settings.title": "Phase Presets",
  "settings.presetName": "Preset {slot} Name",
  "settings.phase12": "Phase 1 -> 2",
  "settings.phase23": "Phase 2 -> 3",
  "settings.phase34": "Phase 3 -> 4",
  "settings.phase4on": "Phase 4 -> On",

  "setTime.title": "Set new countdown",
  "setTime.message": "Lv.{lv} Ch.{ch}. Examples: 30, 2:12, :30",
  "setTime.invalid": "Use minutes (30), H:MM (2:12), or :MM (:30).",
  "setTime.failure": "Failed to update time.",

  "mute.tooltipMute": "Mute alarm",
  "mute.tooltipUnmute": "Unmute alarm",
  "volume.aria": "Alarm volume",

  "promo.subscribe": "Please Subscribe at",
  "promo.support": "Feel free to support us by Join our membership or this link",
  "promo.thanks": "Thanks and enjoyed !",

  "home.subtitle": "Create a room to share timers, or join an existing room code.",
  "home.createRoom": "Create Room",
  "home.createRoomNameLabel": "Room Name (optional)",
  "home.createRoomNamePlaceholder": "Guild Party A",
  "home.creating": "Creating...",
  "home.joinRoom": "Join Room",
  "home.joining": "Joining...",
  "home.roomCode": "Room Code",
  "home.errorEmpty": "Please enter a room code.",
  "home.errorNotFound": "Room not found. Check the room code.",

  "room.loading": "Loading room...",
  "room.back": "Back to room chooser",
  "room.notFound": "Room not found.",

  "tab.main": "Main",
  "tab.hardcore": "Hardcore",

  "hardcore.addPlaceholder": "3 1.2 / 12 3 5 / 12 3 20m / 12 3 1h20",
  "hardcore.addHint": "Lv [Ch] <phase 1-5 or 1.1-4.9> or <Nm or NhMM>. Channel defaults to 1. Press Enter.",
  "hardcore.errorInvalid": "Invalid. Use: Lv [Ch] <phase 1-5, 1.1-4.9, Nm, or NhMM>.",
  "hardcore.empty": "No hardcore trackers yet. Type above and press Enter.",
  "hardcore.elapsed": "Elapsed",
  "hardcore.countdown": "Until phase 1",
  "hardcore.bumpDecimal": "Bump phase decimal +0.2",
  "hardcore.sortBy": "Sort:",
  "hardcore.sort.time": "Time",
  "hardcore.sort.phase": "Phase",
  "hardcore.hideCooldown": "Hide cooldown",
  "hardcore.sortByTime": "Sort by Time",
  "hardcore.sortByPhase": "Sort by Phase",
  "hardcore.sortByLv": "Sort by Lv",
};

const th: Dictionary = {
  "app.leave": "ออกห้อง",
  "app.settings": "ตั้งค่า",
  "app.language": "EN / TH",
  "app.whatsNew": "มีอะไรใหม่",

  "room.code": "รหัสห้อง",
  "room.name": "ชื่อห้อง",
  "room.unnamed": "ห้องไม่มีชื่อ",

  "presence.online": "ออนไลน์ {count} คน",

  "action.addBoss": "เพิ่มการติดตามบอส",
  "action.addBossShort": "เพิ่มบอส",
  "action.cancel": "ยกเลิก",
  "action.add": "เพิ่ม",
  "action.adding": "กำลังเพิ่ม...",
  "action.save": "บันทึก",
  "action.saving": "กำลังบันทึก...",
  "action.ok": "ตกลง",
  "action.set": "ตั้ง",
  "action.clearFilters": "ล้างตัวกรอง",

  "sort.byTime": "เรียงตามเวลา",
  "sort.byCh": "เรียงตาม Ch",

  "filter.label": "กรอง",
  "filter.allLv": "ทุก Lv",
  "filter.allPresets": "ทุกพรีเซ็ต",
  "filter.groupByMap": "จัดกลุ่มตามแมพ",

  "tracker.remove": "ลบ",
  "tracker.setTime": "ตั้งเวลา",
  "tracker.empty": "ยังไม่มีบอสที่ติดตาม กด + เพื่อเพิ่ม",
  "tracker.emptyFiltered": "ไม่มีบอสที่ตรงกับตัวกรองของคุณ",
  "tracker.new": "ใหม่",
  "tracker.trackers": "รายการ",
  "tracker.tracker": "รายการ",

  "add.title": "เพิ่มการติดตามบอส",
  "add.quickLabel": "คำสั่งด่วน",
  "add.quickHint":
    "Quick: Lv Ch Last [Preset] ตัวอย่าง: 103 2 2.5 1 ค่า Last ใส่ 1-4, ทศนิยม (2.5), H:MM หรือ :MM ได้ Preset เป็นตัวเลือก (1-3), ค่าเริ่มต้นคือ 1",
  "add.customLabel": "คำสั่งกำหนดเอง (ไม่บังคับ ข้ามค่า Phase เริ่มต้น)",
  "add.customHint":
    "Custom: Lv Ch Duration [Preset] ตัวอย่าง: 103 2 :30 2 หรือ 103 2 :30 Duration ตั้งเวลาถอยหลังโดยตรง Preset เป็นตัวเลือก ถ้าไม่ใส่จะแสดง N/A",
  "add.errorEmpty": "กรุณากรอกคำสั่งด่วนหรือคำสั่งกำหนดเอง",
  "add.errorQuickInvalid":
    "คำสั่งด่วนไม่ถูกต้อง ตัวอย่าง: '103 12 3', '103 12 2.75 2', '103 13 04:32' หรือ '103 13 :5 3'",
  "add.errorCustomInvalid":
    "คำสั่งกำหนดเองไม่ถูกต้อง ใช้รูปแบบ: '103 12 5', '103 12 2:12', '103 12 :5' หรือเพิ่ม preset: '103 12 :30 2'",
  "add.errorPresetBlank": "พรีเซ็ต {slot} ว่างอยู่ กรุณาตั้งค่าใน Settings ก่อน",
  "add.success": "เพิ่มการติดตามแล้ว",
  "add.failure": "ไม่สามารถเพิ่มการติดตามได้",

  "settings.title": "พรีเซ็ตเฟส",
  "settings.presetName": "ชื่อพรีเซ็ต {slot}",
  "settings.phase12": "Phase 1 -> 2",
  "settings.phase23": "Phase 2 -> 3",
  "settings.phase34": "Phase 3 -> 4",
  "settings.phase4on": "Phase 4 -> On",

  "setTime.title": "ตั้งเวลาถอยหลังใหม่",
  "setTime.message": "Lv.{lv} Ch.{ch} ตัวอย่าง: 30, 2:12, :30",
  "setTime.invalid": "ใช้รูปแบบนาที (30), H:MM (2:12) หรือ :MM (:30)",
  "setTime.failure": "ไม่สามารถอัพเดทเวลาได้",

  "mute.tooltipMute": "ปิดเสียงเตือน",
  "mute.tooltipUnmute": "เปิดเสียงเตือน",
  "volume.aria": "ระดับเสียงเตือน",

  "promo.subscribe": "กด Subscribe ได้ที่",
  "promo.support": "สนับสนุนเราผ่านสมาชิกหรือลิงก์นี้",
  "promo.thanks": "ขอบคุณและสนุกกับเกมนะ !",

  "home.subtitle": "สร้างห้องเพื่อแชร์ตัวจับเวลา หรือใส่รหัสห้องเพื่อเข้าร่วม",
  "home.createRoom": "สร้างห้อง",
  "home.createRoomNameLabel": "ชื่อห้อง (ไม่บังคับ)",
  "home.createRoomNamePlaceholder": "ปาร์ตี้กิลด์ A",
  "home.creating": "กำลังสร้าง...",
  "home.joinRoom": "เข้าร่วมห้อง",
  "home.joining": "กำลังเข้าร่วม...",
  "home.roomCode": "รหัสห้อง",
  "home.errorEmpty": "กรุณาใส่รหัสห้อง",
  "home.errorNotFound": "ไม่พบห้อง กรุณาตรวจสอบรหัสห้อง",

  "room.loading": "กำลังโหลดห้อง...",
  "room.back": "กลับไปหน้าเลือกห้อง",
  "room.notFound": "ไม่พบห้อง",

  "tab.main": "ปกติ",
  "tab.hardcore": "Hardcore",

  "hardcore.addPlaceholder": "3 1.2 / 12 3 5 / 12 3 20m / 12 3 1h20",
  "hardcore.addHint": "Lv [Ch] <เฟส 1-5 หรือ 1.1-4.9> หรือ <Nm หรือ NhMM>. ช่องเริ่มต้นคือ 1 กด Enter เพื่อเพิ่ม",
  "hardcore.errorInvalid": "รูปแบบไม่ถูกต้อง: Lv [Ch] <เฟส 1-5, 1.1-4.9, Nm, หรือ NhMM>",
  "hardcore.empty": "ยังไม่มีการติดตาม Hardcore พิมพ์ด้านบนแล้วกด Enter",
  "hardcore.elapsed": "เวลาที่ผ่านไป",
  "hardcore.countdown": "ก่อนเฟส 1",
  "hardcore.bumpDecimal": "เพิ่มทศนิยมเฟส +0.2",
  "hardcore.sortBy": "เรียง:",
  "hardcore.sort.time": "เวลา",
  "hardcore.sort.phase": "เฟส",
  "hardcore.hideCooldown": "ซ่อนคูลดาวน์",
  "hardcore.sortByTime": "เรียงตามเวลา",
  "hardcore.sortByPhase": "เรียงตามเฟส",
  "hardcore.sortByLv": "เรียงตาม Lv",
};

export const DICTIONARIES: Record<Locale, Dictionary> = { en, th };

export function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`,
  );
}
