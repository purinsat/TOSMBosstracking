"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import {
  LATEST_WHATS_NEW_VERSION,
  WHATS_NEW_RELEASES,
  WHATS_NEW_STORAGE_KEY,
} from "@/lib/whatsNew";

type WhatsNewContextValue = {
  open: () => void;
};

const WhatsNewContext = createContext<WhatsNewContextValue | null>(null);

function readSeenVersion(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(WHATS_NEW_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribeSeenVersion(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === WHATS_NEW_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function WhatsNewProvider({ children }: { children: ReactNode }) {
  const seenVersion = useSyncExternalStore(
    subscribeSeenVersion,
    readSeenVersion,
    () => "",
  );
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  const shouldAutoOpen =
    !manuallyDismissed && !!LATEST_WHATS_NEW_VERSION && seenVersion !== LATEST_WHATS_NEW_VERSION;
  const isOpen = forceOpen || shouldAutoOpen;

  const close = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, LATEST_WHATS_NEW_VERSION);
      } catch {
        // ignore storage errors
      }
    }
    setManuallyDismissed(true);
    setForceOpen(false);
  }, []);

  const open = useCallback(() => {
    setForceOpen(true);
    setManuallyDismissed(false);
  }, []);

  const value = useMemo<WhatsNewContextValue>(() => ({ open }), [open]);

  return (
    <WhatsNewContext.Provider value={value}>
      {children}
      {isOpen && <WhatsNewDialog onClose={close} />}
    </WhatsNewContext.Provider>
  );
}

export function useWhatsNew(): WhatsNewContextValue {
  const ctx = useContext(WhatsNewContext);
  if (!ctx) throw new Error("useWhatsNew must be used inside <WhatsNewProvider>");
  return ctx;
}

function WhatsNewDialog({ onClose }: { onClose: () => void }) {
  const { t, locale } = useLocale();
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-xl"
      >
        <h2 id="whats-new-title" className="text-xl font-bold text-sky-300">
          {t("app.whatsNew")}
        </h2>
        <div className="mt-4 flex flex-col gap-5">
          {WHATS_NEW_RELEASES.map((release) => {
            const highlights = release.highlights[locale] ?? release.highlights.en;
            return (
              <section key={release.version}>
                <header className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm font-semibold text-sky-300">
                    v{release.version}
                  </span>
                  <span className="text-xs text-slate-400">{release.date}</span>
                </header>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                  {highlights.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-xl border border-sky-500 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-950/40"
            onClick={onClose}
          >
            {t("action.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
