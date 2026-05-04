"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  DICTIONARIES,
  SUPPORTED_LOCALES,
  formatMessage,
  type Dictionary,
  type Locale,
} from "@/lib/i18n/dictionaries";

const STORAGE_KEY = "tosm-bt-locale";
const DEFAULT_LOCALE: Locale = "en";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: <K extends keyof Dictionary>(key: K, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const localeSubscribers = new Set<() => void>();

function readLocaleSnapshot(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
      return raw as Locale;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_LOCALE;
}

function subscribeLocale(onStoreChange: () => void): () => void {
  localeSubscribers.add(onStoreChange);
  if (typeof window !== "undefined") {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onStoreChange();
    };
    window.addEventListener("storage", handler);
    return () => {
      localeSubscribers.delete(onStoreChange);
      window.removeEventListener("storage", handler);
    };
  }
  return () => {
    localeSubscribers.delete(onStoreChange);
  };
}

function writeLocale(next: Locale) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }
  for (const cb of localeSubscribers) cb();
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    readLocaleSnapshot,
    () => DEFAULT_LOCALE,
  );

  const setLocale = useCallback((next: Locale) => {
    writeLocale(next);
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
    return {
      locale,
      setLocale,
      t: (key, vars) => formatMessage(dict[key] ?? key, vars),
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
