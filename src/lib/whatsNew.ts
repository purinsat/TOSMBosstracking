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
