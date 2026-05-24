"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Plus, MessageSquare, Trash2, Pencil } from "lucide-react";
import { chatsStore, subscribeChats, type Chat } from "@/lib/chats";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
};

export function ChatHistorySheet({
  open,
  onClose,
  activeId,
  onSelect,
  onNew,
}: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const sync = () => setChats(chatsStore.list());
    sync();
    return subscribeChats(sync);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => {
      if (c.title.toLowerCase().includes(q)) return true;
      // Search the first few messages too — find chats by content, not just title.
      return c.messages.slice(0, 6).some((m) =>
        (m.content || "").toLowerCase().includes(q)
      );
    });
  }, [chats, query]);

  function rename(id: string, currentTitle: string) {
    const next = window.prompt("Rename chat", currentTitle);
    if (next && next.trim() && next.trim() !== currentTitle) {
      chatsStore.rename(id, next.trim());
    }
  }

  function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    chatsStore.remove(id);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            key="sheet"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-y-0 left-0 z-[61] w-[88vw] max-w-sm bg-surface-container-low/95 backdrop-blur-2xl border-r border-white/10 flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-white/5">
              <div>
                <h2 className="text-headline-lg-mobile font-semibold tracking-tight">
                  Chats
                </h2>
                <p className="text-label-sm text-on-surface-variant">
                  {chats.length} {chats.length === 1 ? "conversation" : "conversations"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-surface-container-high/60 border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </header>

            {/* New + search */}
            <div className="px-5 py-3 flex flex-col gap-2 border-b border-white/5">
              <button
                onClick={() => {
                  onNew();
                  onClose();
                }}
                className="w-full px-4 py-2.5 rounded-full bg-white text-black text-label-md font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                New chat
              </button>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none"
                  strokeWidth={1.8}
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-9 pr-3 py-2 rounded-full bg-surface-container-lowest border border-white/10 text-body-md text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6 text-on-surface-variant">
                  <MessageSquare className="w-7 h-7" strokeWidth={1.5} />
                  <p className="text-body-md">
                    {chats.length === 0
                      ? "No chats yet"
                      : "Nothing matches your search"}
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <Row
                        chat={c}
                        active={c.id === activeId}
                        onSelect={() => {
                          onSelect(c.id);
                          onClose();
                        }}
                        onRename={() => rename(c.id, c.title)}
                        onDelete={() => remove(c.id, c.title)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({
  chat,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  chat: Chat;
  active: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const last = chat.messages[chat.messages.length - 1];
  const subtitle = last?.content?.split("\n")[0] || "(empty)";
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-2xl px-3 py-2.5 transition-colors",
        active
          ? "bg-surface-container-high/60"
          : "hover:bg-white/[0.04]"
      )}
    >
      <button
        onClick={onSelect}
        className="flex-1 min-w-0 text-left"
      >
        <div className="text-body-md text-white truncate">{chat.title}</div>
        <div className="text-label-sm text-on-surface-variant truncate">
          {subtitle}
        </div>
      </button>
      <button
        onClick={onRename}
        className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-white transition-all"
        aria-label="Rename"
      >
        <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
      </button>
      <button
        onClick={onDelete}
        className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-all"
        aria-label="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}
