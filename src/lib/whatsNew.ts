import type { Locale } from "@/lib/i18n/dictionaries";

export type WhatsNewEntry = {
  version: string;
  date: string;
  highlights: Record<Locale, string[]>;
};

export const WHATS_NEW_STORAGE_KEY = "tosm-bt-whats-new-seen";

/**
 * Ordered newest-first. The top entry's version is what gets compared to the
 * stored "seen" version to decide whether to auto-open the modal.
 */
export const WHATS_NEW_RELEASES: WhatsNewEntry[] = [
  {
    version: "2026.05.08",
    date: "2026-05-08",
    highlights: {
      en: [
        "New Hardcore tab: track bosses without presets, perfect for low-level maps where phase timing varies.",
        "Add trackers with Lv Ch Phase (e.g. 72 1 2.5) or Lv Ch Duration (e.g. 72 1 2:00 or 72 1 :20). Press Enter — no modal.",
        "Dense grid layout: see many maps at a glance in a small window beside the game.",
        "Tap the phase badge to cycle 1→2→3→4→1. Tap +.1 to bump the decimal (2.3→2.4).",
        "Duration trackers count down to phase 1, then count forward. Auto-removed after 5 hours.",
      ],
      th: [
        "แท็บ Hardcore ใหม่: ติดตามบอสโดยไม่ใช้พรีเซ็ต เหมาะกับแมพเลเวลต่ำที่เวลาเฟสไม่แน่นอน",
        "เพิ่มผ่านคำสั่ง Lv Ch เฟส (เช่น 72 1 2.5) หรือ Lv Ch เวลา (เช่น 72 1 2:00 หรือ 72 1 :20) กด Enter ได้เลย ไม่มีป็อปอัพ",
        "เลย์เอาต์ตารางขนาดกะทัดรัด: ดูหลายแมพได้พร้อมกันในหน้าต่างเล็กข้างเกม",
        "แตะป้ายเฟสเพื่อเปลี่ยน 1→2→3→4→1 แตะ +.1 เพื่อเพิ่มทศนิยม (2.3→2.4)",
        "ตัวจับเวลาแบบ Duration นับถอยหลังถึงเฟส 1 แล้วนับขึ้น ลบอัตโนมัติหลัง 5 ชั่วโมง",
      ],
    },
  },
  {
    version: "2026.05.03",
    date: "2026-05-03",
    highlights: {
      en: [
        "New tracker rows flash for a few seconds when someone else adds them — you can't miss it anymore.",
        "Large monospace countdown + progress ring on every row.",
        "Sticky bottom action bar on mobile with Add / Mute / Sort.",
        "Filter chips by Map Lv and Preset, plus a Group-by-map collapsible view.",
        "Live hunter count next to the room code.",
        "Thai language toggle (EN / TH).",
        "Install as an app (PWA).",
        "Toast + in-page prompts replacing the old browser alert/prompt.",
      ],
      th: [
        "แถวที่เพิ่มใหม่จะกระพริบอยู่ไม่กี่วินาที เมื่อมีคนในห้องเพิ่มตัวจับเวลาใหม่",
        "นาฬิกาถอยหลังขนาดใหญ่ + วงแหวนแสดงความคืบหน้าในทุกแถว",
        "แถบปุ่มลัดด้านล่างในมือถือ: เพิ่ม / ปิดเสียง / เรียง",
        "ตัวกรองตามเลเวลแผนที่และพรีเซ็ต พร้อมโหมดจัดกลุ่มตามแผนที่แบบย่อ-ขยาย",
        "แสดงจำนวนผู้เล่นที่กำลังออนไลน์ข้างรหัสห้อง",
        "สลับภาษา ไทย / อังกฤษ ได้",
        "ติดตั้งเป็นแอพ (PWA) ได้",
        "แจ้งเตือนและกล่องกรอกข้อมูลในหน้าเว็บ แทน alert / prompt ของเบราว์เซอร์",
      ],
    },
  },
];

export const LATEST_WHATS_NEW_VERSION = WHATS_NEW_RELEASES[0]?.version ?? "";
