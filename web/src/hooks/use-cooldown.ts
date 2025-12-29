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
  const [cooldownUntil, setCooldownUntil] = useState(() =>
    readNumber(COOLDOWN_UNTIL_KEY)
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!cooldownUntil) return;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(COOLDOWN_UNTIL_KEY, "0");
        }
        setCooldownUntil(0);
      }
    };

    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const remainingMs = Math.max(0, cooldownUntil - now);
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
