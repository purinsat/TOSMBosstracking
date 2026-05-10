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
    version: "2026.05.10",
    date: "2026-05-10",
    highlights: {
      en: [
        "Hardcore: countdown tiles auto-switch to Phase 1 when time hits 0.",
        "Hardcore: type Lv Phase (e.g. 3 1.2) — channel defaults to 1.",
        "Hardcore: new duration formats — 20m, 1h20, 1h20m (no Shift needed).",
        "Hardcore: snapshot sort — click Sort by Time or Sort by Phase; tiles won't shuffle while you tap.",
        "Hardcore: Hide cooldown toggle to show only active phase tiles.",
        "Min map Lv lowered to 3.",
      ],
      th: [
        "Hardcore: ไทล์นับถอยหลังเปลี่ยนเป็นเฟส 1 อัตโนมัติเมื่อหมดเวลา",
        "Hardcore: พิมพ์แค่ Lv เฟส (เช่น 3 1.2) — ช่องเริ่มต้นคือ 1",
        "Hardcore: รูปแบบเวลาใหม่ — 20m, 1h20, 1h20m (ไม่ต้องกด Shift)",
        "Hardcore: เรียงแบบ snapshot — กด Sort by Time หรือ Sort by Phase ไทล์จะไม่กระโดดขณะแตะ",
        "Hardcore: ปุ่มซ่อนคูลดาวน์ แสดงเฉพาะไทล์ที่มีเฟสแล้ว",
        "รองรับแมพตั้งแต่ Lv 3 ขึ้นไป",
      ],
    },
  },
];

export const LATEST_WHATS_NEW_VERSION = WHATS_NEW_RELEASES[0]?.version ?? "";
