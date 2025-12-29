"use client";

import { useCallback, useEffect, useState } from "react";

const LAST_SUCCESS_KEY = "rol:last-success";
const COOLDOWN_UNTIL_KEY = "rol:cooldown-until";
const TRIGGER_WINDOW_MS = 7_000;
const COOLDOWN_MS = 11_000;

const readNumber = (key: string) => {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(key);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useCooldown() {
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);

  const syncCooldown = useCallback(() => {
    const stored = readNumber(COOLDOWN_UNTIL_KEY);
    setCooldownUntil(stored);
  }, []);

  useEffect(() => {
    syncCooldown();
  }, [syncCooldown]);

  useEffect(() => {
    if (!cooldownUntil) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, cooldownUntil - now);
      setRemainingMs(remaining);
      if (remaining === 0) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(COOLDOWN_UNTIL_KEY, "0");
        }
        setCooldownUntil(0);
      }
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const isCooling = remainingMs > 0;

  const markSuccess = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_SUCCESS_KEY, String(Date.now()));
  }, []);

  const startCooldownIfNeeded = useCallback(() => {
    if (typeof window === "undefined") return false;
    const now = Date.now();
    const until = readNumber(COOLDOWN_UNTIL_KEY);
    if (until > now) {
      setCooldownUntil(until);
      return true;
    }

    const lastSuccess = readNumber(LAST_SUCCESS_KEY);
    if (lastSuccess && now - lastSuccess < TRIGGER_WINDOW_MS) {
      const nextUntil = now + COOLDOWN_MS;
      window.localStorage.setItem(COOLDOWN_UNTIL_KEY, String(nextUntil));
      setCooldownUntil(nextUntil);
      return true;
    }
    return false;
  }, []);

  return {
    isCooling,
    remainingMs,
    markSuccess,
    startCooldownIfNeeded,
  };
}
