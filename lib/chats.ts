"use client";

/**
 * localStorage-backed chat history. Image slots persist their final state,
 * so re-opening a chat shows the same images that were generated at the time.
 * Pub/sub mirrors `lib/store.ts` so the history sheet can re-render on any
 * mutation, including same-tab.
 */

const KEY = "neural-studio.chats.v1";
const ACTIVE_KEY = "neural-studio.chats.active.v1";
const EVENT = "neural-studio:chats:changed";

export type ChatImageSlot = {
  prompt: string;
  aspectRatio: string;
  status: "pending" | "ready" | "error";
  url?: string;
  galleryId?: string;
  error?: string;
};

export type ChatAttachment = {
  url: string;
  alt?: string;
};

export type ChatMessage =
  | {
      id: string;
      role: "user";
      content: string;
      attachments?: ChatAttachment[];
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      images?: ChatImageSlot[];
    };

export type Chat = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

function readAll(): Chat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Chat[];
    // Backfill ids on legacy records so patch-by-id rendering keeps working.
    let mutated = false;
    for (const chat of parsed) {
      for (const m of chat.messages) {
        if (!m.id) {
          (m as { id: string }).id = newId();
          mutated = true;
        }
      }
    }
    if (mutated) writeAll(parsed);
    return parsed;
  } catch {
    return [];
  }
}

function writeAll(chats: Chat[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(chats));
  } catch (e) {
    // Quota exceeded — drop oldest first; chat history is the most disposable.
    console.warn("chat history quota exceeded, trimming", e);
    const sorted = [...chats].sort((a, b) => a.updatedAt - b.updatedAt);
    while (sorted.length > 1) {
      sorted.shift();
      try {
        localStorage.setItem(KEY, JSON.stringify(sorted));
        break;
      } catch {
        /* keep trimming */
      }
    }
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function newMessageId() {
  return newId();
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user")?.content?.trim();
  if (!first) return "New chat";
  const firstLine = first.split(/\r?\n/)[0]!;
  const trimmed = firstLine.length > 40 ? firstLine.slice(0, 40) + "…" : firstLine;
  return trimmed.replace(/[?.!,;:]+$/, "");
}

export const chatsStore = {
  list(): Chat[] {
    return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
  },

  get(id: string): Chat | undefined {
    return readAll().find((c) => c.id === id);
  },

  /** No-ops on empty messages so we don't write a junk record before the user types. */
  save({
    id,
    messages,
    title,
  }: {
    id?: string;
    messages: ChatMessage[];
    title?: string;
  }): Chat | undefined {
    if (!messages.length) return undefined;
    const all = readAll();
    const now = Date.now();
    if (id) {
      const idx = all.findIndex((c) => c.id === id);
      if (idx >= 0) {
        const cur = all[idx]!;
        const next: Chat = {
          ...cur,
          messages,
          title: title?.trim() || cur.title || deriveTitle(messages),
          updatedAt: now,
        };
        all[idx] = next;
        writeAll(all);
        return next;
      }
    }
    const created: Chat = {
      id: id || newId(),
      title: title?.trim() || deriveTitle(messages),
      createdAt: now,
      updatedAt: now,
      messages,
    };
    all.push(created);
    writeAll(all);
    return created;
  },

  rename(id: string, title: string) {
    const all = readAll();
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx]!, title: title.trim() || all[idx]!.title, updatedAt: Date.now() };
    writeAll(all);
  },

  remove(id: string) {
    writeAll(readAll().filter((c) => c.id !== id));
    if (getActiveId() === id) setActiveId(null);
  },

  clear() {
    writeAll([]);
    setActiveId(null);
  },
};

export function getActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeChats(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
