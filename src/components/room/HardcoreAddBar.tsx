"use client";

import { useRef, useState } from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";

type Props = {
  onSubmit: (raw: string) => Promise<void> | void;
};

export function HardcoreAddBar({ onSubmit }: Props) {
  const { t } = useLocale();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || submitting || !value.trim()) return;
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(value.trim());
      setValue("");
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitting}
        placeholder={t("hardcore.addPlaceholder")}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none disabled:opacity-60"
        aria-label={t("hardcore.addPlaceholder")}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <p className="text-xs text-slate-500">{t("hardcore.addHint")}</p>
    </div>
  );
}
