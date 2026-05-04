"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "info" | "success" | "error";

export type ToastOptions = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs: number;
};

type ToastApi = {
  show: (options: ToastOptions) => string;
  info: (message: string, durationMs?: number) => string;
  success: (message: string, durationMs?: number) => string;
  error: (message: string, durationMs?: number) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const DEFAULT_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const handle = timeoutsRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    ({ message, tone = "info", durationMs = DEFAULT_DURATION_MS }: ToastOptions) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const toast: ToastItem = { id, message, tone, durationMs };
      setToasts((prev) => [...prev, toast]);
      if (durationMs > 0) {
        const handle = setTimeout(() => dismiss(id), durationMs);
        timeoutsRef.current.set(id, handle);
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      info: (message, durationMs) => show({ message, tone: "info", durationMs }),
      success: (message, durationMs) => show({ message, tone: "success", durationMs }),
      error: (message, durationMs) => show({ message, tone: "error", durationMs }),
      dismiss,
    }),
    [show, dismiss],
  );

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      for (const handle of timeouts.values()) clearTimeout(handle);
      timeouts.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3 sm:items-end sm:top-4 sm:right-4 sm:left-auto sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur transition ${toneClasses(toast.tone)}`}
        >
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-base leading-5">
              {toneIcon(toast.tone)}
            </span>
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function toneClasses(tone: ToastTone): string {
  switch (tone) {
    case "success":
      return "border-emerald-500/60 bg-emerald-950/85 text-emerald-100";
    case "error":
      return "border-rose-500/60 bg-rose-950/85 text-rose-100";
    case "info":
    default:
      return "border-sky-500/60 bg-slate-900/90 text-slate-100";
  }
}

function toneIcon(tone: ToastTone): string {
  switch (tone) {
    case "success":
      return "✓";
    case "error":
      return "!";
    case "info":
    default:
      return "i";
  }
}
