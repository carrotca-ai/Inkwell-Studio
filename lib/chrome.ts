"use client";

/** Persistent visibility flags for the global app chrome (top bar + bottom nav). */

import { useEffect, useState } from "react";

const KEY = "inkwell.chrome.v1";
const EVENT = "inkwell:chrome:changed";

export type ChromeState = {
  topHidden: boolean;
  bottomHidden: boolean;
};

const DEFAULT: ChromeState = { topHidden: false, bottomHidden: false };

function read(): ChromeState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ChromeState>;
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

function write(state: ChromeState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getChrome(): ChromeState {
  return read();
}

export function setChrome(patch: Partial<ChromeState>) {
  write({ ...read(), ...patch });
}

export function toggleChrome(key: keyof ChromeState) {
  const cur = read();
  write({ ...cur, [key]: !cur[key] });
}

export function useChrome(): ChromeState {
  const [state, setState] = useState<ChromeState>(DEFAULT);
  useEffect(() => {
    setState(read());
    const sync = () => setState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}
