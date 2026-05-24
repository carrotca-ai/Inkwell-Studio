"use client";

/**
 * User-overridable model IDs and runtime settings, persisted in localStorage.
 * Reading is server-safe (returns defaults). Writing fires `settings:changed`.
 */

import { useEffect, useState } from "react";

const KEY = "inkwell.settings.v1";
const EVENT = "inkwell:settings:changed";

export type AspectRatio = "1:1" | "2:3" | "3:2" | "16:9" | "9:16";

export type Settings = {
  chatModel: string;
  imageModel: string;
  /** Falls back to imageModel if empty. */
  imageEditModel: string;
  /** When empty, "Make Video" is hidden. */
  videoModel: string;
  /** When empty, voice features stay hidden. */
  ttsModel: string;
  /** Free-form per-request system prompt for chat. */
  systemPrompt: string;
  batchSize: 1 | 2 | 3 | 4;
  aspectRatio: AspectRatio;
  /** kie.ai `enable_pro` — quality vs speed. */
  quality: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  chatModel: "openrouter/owl-alpha",
  imageModel: "",
  imageEditModel: "",
  videoModel: "",
  ttsModel: "",
  systemPrompt: "",
  batchSize: 4,
  aspectRatio: "1:1",
  quality: true,
};

function readRaw(): Partial<Settings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {};
  } catch {
    return {};
  }
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readRaw() };
}

export function setSettings(patch: Partial<Settings>) {
  if (typeof window === "undefined") return;
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function resetSettings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useSettings(): Settings {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setS(getSettings());
    const onChange = () => setS(getSettings());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return s;
}
