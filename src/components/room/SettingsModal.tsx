"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import {
  applyPresetInputsToSettings,
  toPresetTimingInputs,
  type PresetTimingInputs,
} from "@/lib/mappers";
import type { PhaseTimings, Settings } from "@/lib/types";

type Props = {
  open: boolean;
  settings: Settings;
  saving: boolean;
  onClose: () => void;
  onSave: (next: Settings) => Promise<boolean> | boolean;
};

export function SettingsModal({ open, settings, saving, onClose, onSave }: Props) {
  if (!open) return null;
  return (
    <SettingsModalInner
      settings={settings}
      saving={saving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function SettingsModalInner({
  settings,
  saving,
  onClose,
  onSave,
}: Omit<Props, "open">) {
  const { t } = useLocale();
  const [draft, setDraft] = useState<Settings>(settings);
  const [inputs, setInputs] = useState<
    [PresetTimingInputs, PresetTimingInputs, PresetTimingInputs]
  >(() => toPresetTimingInputs(settings));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fields: Array<[keyof PhaseTimings, string]> = [
    ["p12", t("settings.phase12")],
    ["p23", t("settings.phase23")],
    ["p34", t("settings.phase34")],
    ["p4on", t("settings.phase4on")],
  ];

  function updateName(slot: 1 | 2 | 3, value: string) {
    setDraft((prev) => {
      const presets = [...prev.presets] as Settings["presets"];
      presets[slot - 1] = { ...presets[slot - 1], name: value };
      return { ...prev, presets };
    });
  }

  function updateNumber(slot: 1 | 2 | 3, key: keyof PhaseTimings, value: string) {
    if (value.trim() !== "") {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) return;
    }
    setInputs((prev) => {
      const next = [...prev] as [PresetTimingInputs, PresetTimingInputs, PresetTimingInputs];
      next[slot - 1] = { ...next[slot - 1], [key]: value };
      return next;
    });
  }

  async function handleSave() {
    const next = applyPresetInputsToSettings(draft, inputs);
    const ok = await onSave(next);
    if (ok) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-5"
      >
        <h2 id="settings-title" className="mb-4 text-xl font-bold">
          {t("settings.title")}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((slot) => {
            const preset = draft.presets[slot - 1];
            const timingInputs = inputs[slot - 1];
            return (
              <section key={slot} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">
                    {t("settings.presetName", { slot })}
                  </span>
                  <input
                    type="text"
                    value={preset.name}
                    onChange={(e) => updateName(slot as 1 | 2 | 3, e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                    placeholder={`Preset ${slot}`}
                  />
                </label>
                <div className="mt-3 space-y-2">
                  {fields.map(([key, label]) => (
                    <label key={key} className="block text-sm text-slate-300">
                      <span className="mb-1 block">{label}</span>
                      <input
                        type="number"
                        min={0}
                        value={timingInputs[key]}
                        onChange={(e) =>
                          updateNumber(slot as 1 | 2 | 3, key, e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                        placeholder={slot === 1 ? "0" : "Blank"}
                      />
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-700 px-4 py-2"
            onClick={onClose}
          >
            {t("action.cancel")}
          </button>
          <button
            type="button"
            className="rounded-xl border border-sky-500 px-4 py-2 font-semibold text-sky-300 disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t("action.saving") : t("action.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
