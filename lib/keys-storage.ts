"use client";

/**
 * Client-side key vault stored in localStorage. The list is forwarded to the
 * server in every API request and merged with `process.env.KIE_API_KEYS`.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "neural-studio.kie-keys.v1";
const EVENT = "neural-studio:kie-keys:changed";

export type StoredKey = {
  key: string;
  label?: string;
  credits?: number;
  status?: "ok" | "low" | "exhausted" | "invalid";
  testedAt?: number;
  error?: string;
};

function read(): StoredKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredKey[]) : [];
  } catch {
    return [];
  }
}

function write(keys: StoredKey[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Parse a free-form bulk-paste blob into individual keys. Handles common
 *  separators, strips comments after `#` or `//`, and drops obvious junk. */
export function parseBulk(input: string): string[] {
  return input
    .split(/[\n,;]+/)
    .map((line) => line.replace(/(#|\/\/).*$/, "").trim())
    .map((line) => line.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean)
    .filter((tok) => tok.length >= 16 && !/\s/.test(tok));
}

export const keysStore = {
  list(): StoredKey[] {
    return read();
  },
  rawKeys(): string[] {
    return read().map((k) => k.key);
  },
  addBulk(blob: string): { added: number; duplicates: number } {
    const incoming = parseBulk(blob);
    const existing = read();
    const have = new Set(existing.map((k) => k.key));
    let added = 0;
    let duplicates = 0;
    for (const k of incoming) {
      if (have.has(k)) duplicates++;
      else {
        existing.push({ key: k });
        have.add(k);
        added++;
      }
    }
    write(existing);
    return { added, duplicates };
  },
  remove(key: string) {
    write(read().filter((k) => k.key !== key));
  },
  removeWhere(predicate: (k: StoredKey) => boolean) {
    write(read().filter((k) => !predicate(k)));
  },
  clear() {
    write([]);
  },
  update(key: string, patch: Partial<StoredKey>) {
    const all = read();
    const idx = all.findIndex((k) => k.key === key);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...patch };
      write(all);
    }
  },
  updateMany(patches: Array<{ key: string } & Partial<StoredKey>>) {
    const all = read();
    for (const p of patches) {
      const idx = all.findIndex((k) => k.key === p.key);
      if (idx >= 0) all[idx] = { ...all[idx], ...p };
    }
    write(all);
  },
};

export function useKeys(): StoredKey[] {
  const [keys, setKeys] = useState<StoredKey[]>([]);
  useEffect(() => {
    const sync = () => setKeys(keysStore.list());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return keys;
}

export function maskKeyClient(key: string): string {
  if (!key) return "";
  if (key.length < 12) return "•".repeat(key.length);
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
