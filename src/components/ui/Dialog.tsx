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

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

export type PromptOptions = {
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  validate?: (value: string) => string | null;
};

type DialogApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

type ActiveConfirm = {
  kind: "confirm";
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type ActivePrompt = {
  kind: "prompt";
  options: PromptOptions;
  resolve: (value: string | null) => void;
};

type ActiveDialog = ActiveConfirm | ActivePrompt;

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);

  const confirm = useCallback<DialogApi["confirm"]>((options) => {
    return new Promise<boolean>((resolve) => {
      setActive({ kind: "confirm", options, resolve });
    });
  }, []);

  const prompt = useCallback<DialogApi["prompt"]>((options) => {
    return new Promise<string | null>((resolve) => {
      setActive({ kind: "prompt", options, resolve });
    });
  }, []);

  const api = useMemo<DialogApi>(() => ({ confirm, prompt }), [confirm, prompt]);

  const closeConfirm = useCallback((result: boolean) => {
    setActive((current) => {
      if (current?.kind === "confirm") current.resolve(result);
      return null;
    });
  }, []);

  const closePrompt = useCallback((result: string | null) => {
    setActive((current) => {
      if (current?.kind === "prompt") current.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (active?.kind === "confirm") {
          closeConfirm(false);
        } else if (active?.kind === "prompt") {
          closePrompt(null);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, closeConfirm, closePrompt]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {active?.kind === "confirm" && (
        <ConfirmDialog options={active.options} onResolve={closeConfirm} />
      )}
      {active?.kind === "prompt" && (
        <PromptDialog options={active.options} onResolve={closePrompt} />
      )}
    </DialogContext.Provider>
  );
}

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialogs must be used inside <DialogProvider>");
  return ctx;
}

function ConfirmDialog({
  options,
  onResolve,
}: {
  options: ConfirmOptions;
  onResolve: (value: boolean) => void;
}) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmBtnRef.current?.focus();
  }, []);

  const { title, message, confirmLabel = "OK", cancelLabel = "Cancel", tone = "default" } = options;

  return (
    <Scrim onDismiss={() => onResolve(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-xl"
      >
        <h2 id="dialog-title" className="text-lg font-bold">
          {title}
        </h2>
        {message && <p className="mt-2 text-sm text-slate-300">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onResolve(false)}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-slate-500"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => onResolve(true)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              tone === "danger"
                ? "border-rose-500 text-rose-300 hover:bg-rose-950/40"
                : "border-sky-500 text-sky-300 hover:bg-sky-950/40"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Scrim>
  );
}

function PromptDialog({
  options,
  onResolve,
}: {
  options: PromptOptions;
  onResolve: (value: string | null) => void;
}) {
  const {
    title,
    message,
    placeholder,
    initialValue = "",
    confirmLabel = "OK",
    cancelLabel = "Cancel",
    validate,
  } = options;

  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate) {
      const msg = validate(value);
      if (msg) {
        setError(msg);
        return;
      }
    }
    onResolve(value);
  }

  return (
    <Scrim onDismiss={() => onResolve(null)}>
      <form
        onSubmit={handleSubmit}
        aria-modal="true"
        role="dialog"
        aria-labelledby="prompt-title"
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-xl"
      >
        <h2 id="prompt-title" className="text-lg font-bold">
          {title}
        </h2>
        {message && <p className="mt-2 text-sm text-slate-300">{message}</p>}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-base outline-none focus:border-sky-500"
        />
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onResolve(null)}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-slate-500"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="rounded-xl border border-sky-500 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-950/40"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Scrim>
  );
}

function Scrim({
  children,
  onDismiss,
}: {
  children: ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      {children}
    </div>
  );
}
