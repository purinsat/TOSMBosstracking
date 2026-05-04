"use client";

import { useEffect, useRef } from "react";

import { playTimeoutSound } from "@/lib/audio";
import type { Settings, Tracker } from "@/lib/types";

const FIVE_MINUTES_IN_SECONDS = 300;

/**
 * Watches the tracker list and:
 *  - plays a chime when any tracker crosses the 5-minute threshold
 *  - calls onExpire(ids) when trackers reach zero, so the page can remove them
 * The 5-minute chime dedupes per tracker id so it fires only once.
 */
export function useExpiryAlarm(
  trackers: Tracker[],
  settings: Settings,
  nowMs: number,
  onExpire: (ids: string[]) => void,
): void {
  const audioContextRef = useRef<AudioContext | null>(null);
  const alertedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const awaken = () => {
      if (!audioContextRef.current) {
        const ctor = window.AudioContext;
        if (ctor) audioContextRef.current = new ctor();
      }
      if (audioContextRef.current?.state === "suspended") {
        void audioContextRef.current.resume().catch(() => undefined);
      }
    };
    window.addEventListener("pointerdown", awaken);
    window.addEventListener("keydown", awaken);
    return () => {
      window.removeEventListener("pointerdown", awaken);
      window.removeEventListener("keydown", awaken);
    };
  }, []);

  useEffect(() => {
    if (nowMs === 0) return;

    const alerted = alertedIdsRef.current;
    const activeIds = new Set(trackers.map((tracker) => tracker.id));
    for (const id of [...alerted]) {
      if (!activeIds.has(id)) alerted.delete(id);
    }

    const newlyNearFive: string[] = [];
    const expiredIds: string[] = [];

    for (const tracker of trackers) {
      const targetMs = new Date(tracker.targetAt).getTime();
      const remainingSeconds = Math.floor((targetMs - nowMs) / 1000);
      if (
        remainingSeconds <= FIVE_MINUTES_IN_SECONDS &&
        remainingSeconds > 0 &&
        !alerted.has(tracker.id)
      ) {
        alerted.add(tracker.id);
        newlyNearFive.push(tracker.id);
      }
      if (targetMs <= nowMs) expiredIds.push(tracker.id);
    }

    if (newlyNearFive.length > 0) {
      void playTimeoutSound(
        audioContextRef,
        settings.soundVolume,
        settings.soundMuted,
        newlyNearFive.length,
      );
    }

    if (expiredIds.length > 0) {
      for (const id of expiredIds) alerted.delete(id);
      onExpire(expiredIds);
    }
  }, [nowMs, trackers, settings.soundVolume, settings.soundMuted, onExpire]);
}
