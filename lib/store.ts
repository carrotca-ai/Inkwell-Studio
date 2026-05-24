"use client";

/**
 * localStorage-backed gallery for generated images. Each item keeps a
 * versions array (original + edits). Pub/sub fires on every mutation so any
 * mounted component can re-read without polling.
 */

const KEY = "neural-studio.gallery.v1";
const EVENT = "neural-studio:gallery:changed";

export type ImageVersion = {
  url: string;
  prompt: string;
  createdAt: number;
};

export type GalleryItem = {
  id: string;
  createdAt: number;
  versions: ImageVersion[];
  activeIndex: number;
};

function read(): GalleryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GalleryItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: GalleryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    // Quota exceeded — drop oldest until it fits.
    console.warn("gallery quota exceeded, trimming", e);
    while (items.length > 1) {
      items.shift();
      try {
        localStorage.setItem(KEY, JSON.stringify(items));
        break;
      } catch {
        /* keep trimming */
      }
    }
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeGallery(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export const gallery = {
  list(): GalleryItem[] {
    return read().sort((a, b) => b.createdAt - a.createdAt);
  },
  get(id: string): GalleryItem | undefined {
    return read().find((i) => i.id === id);
  },
  create(version: Omit<ImageVersion, "createdAt">): GalleryItem {
    const items = read();
    const item: GalleryItem = {
      id: cryptoId(),
      createdAt: Date.now(),
      versions: [{ ...version, createdAt: Date.now() }],
      activeIndex: 0,
    };
    items.push(item);
    write(items);
    return item;
  },
  addVersion(id: string, version: Omit<ImageVersion, "createdAt">): GalleryItem | undefined {
    const items = read();
    const item = items.find((i) => i.id === id);
    if (!item) return undefined;
    item.versions.push({ ...version, createdAt: Date.now() });
    item.activeIndex = item.versions.length - 1;
    write(items);
    return item;
  },
  setActive(id: string, index: number) {
    const items = read();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    item.activeIndex = Math.max(0, Math.min(index, item.versions.length - 1));
    write(items);
  },
  remove(id: string) {
    write(read().filter((i) => i.id !== id));
  },
};

function cryptoId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
