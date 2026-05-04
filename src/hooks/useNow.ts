"use client";

import { useSyncExternalStore } from "react";

/**
 * Module-level "wall clock" store shared by every useNow() caller.
 *
 * IMPORTANT: getSnapshot MUST return a stable value between ticks — returning
 * a fresh Date.now() every call would look like a torn store to React and
 * cause infinite re-renders.
 */
let currentTick = 0;
const listeners = new Set<() => void>();
let intervalHandle: number | null = null;

function ensureRunning(): void {
  if (intervalHandle !== null || typeof window === "undefined") return;
  currentTick = Date.now();
  intervalHandle = window.setInterval(() => {
    currentTick = Date.now();
    for (const listener of listeners) listener();
  }, 1000);
}

function maybeStop(): void {
  if (listeners.size > 0 || intervalHandle === null) return;
  if (typeof window !== "undefined") window.clearInterval(intervalHandle);
  intervalHandle = null;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  ensureRunning();
  return () => {
    listeners.delete(onStoreChange);
    maybeStop();
  };
}

function getSnapshot(): number {
  return currentTick;
}

function getServerSnapshot(): number {
  return 0;
}

/**
 * Returns a monotonically-increasing Date.now() value that updates every
 * second while any component is subscribed. Returns 0 on the server and on
 * the very first client render (before the interval starts); the first real
 * value is picked up after subscription on the next render.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
