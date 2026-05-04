"use client";

import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { quick: string; custom: string }) => Promise<void> | void;
};

export function AddBossModal({ open, onClose, onSubmit }: Props) {
  if (!open) return null;
  return <AddBossModalInner onClose={onClose} onSubmit={onSubmit} />;
}

function AddBossModalInner({
  onClose,
  onSubmit,
}: Omit<Props, "open">) {
  const { t } = useLocale();
  const [quick, setQuick] = useState("");
  const [custom, setCustom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const quickRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    quickRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ quick, custom });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tracker-title"
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5"
      >
        <h2 id="add-tracker-title" className="mb-4 text-xl font-bold">
          {t("add.title")}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              {t("add.quickLabel")}
            </label>
            <input
              ref={quickRef}
              type="text"
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              placeholder="103 12 3 or 103 12 2.5 1 or 103 13 :5 2"
            />
            <p className="mt-1 text-xs text-slate-400">{t("add.quickHint")}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              {t("add.customLabel")}
            </label>
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              placeholder="103 12 5 or 103 12 :30 2"
            />
            <p className="mt-1 text-xs text-slate-400">{t("add.customHint")}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2"
          >
            {t("action.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl border border-sky-500 px-4 py-2 font-semibold text-sky-300 disabled:opacity-60"
          >
            {submitting ? t("action.adding") : t("action.add")}
          </button>
        </div>
      </form>
    </div>
  );
}
