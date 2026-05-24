"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  ClipboardPaste,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LoaderCircle,
  Trash,
  Coins,
} from "lucide-react";
import {
  keysStore,
  maskKeyClient,
  parseBulk,
  useKeys,
  type StoredKey,
} from "@/lib/keys-storage";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "ok" | "low" | "exhausted" | "invalid" | "untested";

const STATUS_META: Record<
  NonNullable<StoredKey["status"]> | "untested",
  { label: string; icon: typeof CheckCircle2; color: string }
> = {
  ok: { label: "OK", icon: CheckCircle2, color: "text-green-400" },
  low: { label: "Low", icon: AlertCircle, color: "text-yellow-400" },
  exhausted: { label: "Empty", icon: XCircle, color: "text-error" },
  invalid: { label: "Invalid", icon: XCircle, color: "text-error" },
  untested: { label: "?", icon: AlertCircle, color: "text-on-surface-variant" },
};

export function KeysManager() {
  const keys = useKeys();
  const [bulkInput, setBulkInput] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [testing, setTesting] = useState(false);
  const [recentMessage, setRecentMessage] = useState<string | null>(null);

  const totalCredits = useMemo(
    () => keys.reduce((sum, k) => sum + (k.credits ?? 0), 0),
    [keys]
  );

  const counts = useMemo(() => {
    const c = { ok: 0, low: 0, exhausted: 0, invalid: 0, untested: 0 };
    for (const k of keys) {
      const status = k.status ?? "untested";
      c[status as keyof typeof c]++;
    }
    return c;
  }, [keys]);

  const filtered = useMemo(() => {
    if (filter === "all") return keys;
    if (filter === "untested") return keys.filter((k) => !k.status);
    return keys.filter((k) => k.status === filter);
  }, [keys, filter]);

  function flash(msg: string) {
    setRecentMessage(msg);
    setTimeout(() => setRecentMessage(null), 2500);
  }

  function addBulk() {
    if (!bulkInput.trim()) return;
    const { added, duplicates } = keysStore.addBulk(bulkInput);
    setBulkInput("");
    flash(
      [added && `Added ${added}`, duplicates && `${duplicates} duplicates skipped`]
        .filter(Boolean)
        .join(" · ") || "Nothing parsed"
    );
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setBulkInput((cur) => (cur ? cur + "\n" + text : text));
    } catch {
      flash("Clipboard access denied");
    }
  }

  async function testAll() {
    if (!keys.length) return;
    setTesting(true);
    try {
      const res = await fetch("/api/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: keys.map((k) => k.key) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Test failed");
      const results = json.results as Array<{
        key: string;
        credits?: number;
        status: StoredKey["status"];
        error?: string;
      }>;
      keysStore.updateMany(
        results.map((r) => ({
          key: r.key,
          credits: r.credits,
          status: r.status,
          testedAt: Date.now(),
          error: r.error,
        }))
      );
      flash(`Tested ${results.length} keys`);
    } catch (e) {
      flash(`Error: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  function removeExhausted() {
    keysStore.removeWhere((k) => k.status === "exhausted" || k.status === "invalid");
    flash("Removed exhausted & invalid keys");
  }

  function clearAll() {
    if (!confirm(`Remove all ${keys.length} keys?`)) return;
    keysStore.clear();
    flash("All keys removed");
  }

  const previewCount = parseBulk(bulkInput).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total" value={keys.length} />
        <Stat label="Healthy" value={counts.ok + counts.low} accent="text-green-400" />
        <Stat label="Empty/Bad" value={counts.exhausted + counts.invalid} accent="text-error" />
        <Stat
          label="Credits"
          value={totalCredits}
          accent="text-white"
          icon={<Coins className="w-3.5 h-3.5" strokeWidth={1.8} />}
        />
      </div>

      {/* Bulk paste */}
      <div className="flex flex-col gap-2">
        <label className="text-body-md font-medium text-white">Add keys (bulk paste)</label>
        <p className="text-label-sm text-on-surface-variant -mt-1">
          One per line, or comma/space separated. Comments after <code className="font-mono">#</code> or{" "}
          <code className="font-mono">//</code> ignored.
        </p>
        <textarea
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          rows={4}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={"sk-xxxxxxxxxxxxxxx\nsk-yyyyyyyyyyyyyyy   # account 2\n…"}
          className="w-full bg-surface-container-lowest border border-white/10 rounded-2xl px-4 py-3 text-body-md font-mono text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-white/30 transition-colors resize-y min-h-[6rem]"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="px-3 py-2 rounded-full bg-surface-container-high/40 border border-white/10 text-on-surface-variant hover:text-white text-label-sm flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <ClipboardPaste className="w-3.5 h-3.5" strokeWidth={1.8} />
            Paste
          </button>
          <button
            type="button"
            onClick={addBulk}
            disabled={!bulkInput.trim()}
            className="flex-1 px-4 py-2 rounded-full bg-white text-black text-label-md font-semibold disabled:opacity-30 active:scale-[0.98] transition-transform"
          >
            Add {previewCount > 0 ? `(${previewCount})` : ""}
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={testAll}
          disabled={testing || !keys.length}
          className="px-3 py-2 rounded-full bg-surface-container-high/60 border border-white/10 text-white text-label-sm flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40"
        >
          {testing ? (
            <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
          )}
          Test all
        </button>
        <button
          type="button"
          onClick={removeExhausted}
          disabled={!counts.exhausted && !counts.invalid}
          className="px-3 py-2 rounded-full bg-surface-container-high/40 border border-white/10 text-on-surface-variant hover:text-white text-label-sm flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
          Remove empty/bad
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={!keys.length}
          className="px-3 py-2 rounded-full bg-surface-container-high/40 border border-white/10 text-on-surface-variant hover:text-white text-label-sm flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40"
        >
          <Trash className="w-3.5 h-3.5" strokeWidth={1.8} />
          Clear
        </button>
      </div>

      <AnimatePresence>
        {recentMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-label-sm text-on-surface-variant"
          >
            {recentMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter chips */}
      {keys.length > 0 && (
        <div className="flex flex-wrap gap-2 -mb-2">
          {(["all", "ok", "low", "exhausted", "invalid", "untested"] as StatusFilter[]).map(
            (f) => {
              const count =
                f === "all"
                  ? keys.length
                  : counts[f as keyof typeof counts] ?? 0;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-full text-label-sm border transition-all",
                    filter === f
                      ? "bg-white text-black border-white"
                      : "bg-surface-container-high/40 text-on-surface-variant border-white/10 hover:text-white"
                  )}
                >
                  {f} {count > 0 && <span className="opacity-60">· {count}</span>}
                </button>
              );
            }
          )}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 border-dashed p-6 text-center text-on-surface-variant text-body-md">
          {keys.length === 0
            ? "No keys yet — paste them above."
            : "No keys match this filter."}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {filtered.map((k) => (
            <KeyRow key={k.key} item={k} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "text-white",
  icon,
}: {
  label: string;
  value: number;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-container-lowest/60 px-3 py-2">
      <div className="text-label-sm text-on-surface-variant tracking-widest uppercase">
        {label}
      </div>
      <div className={cn("flex items-center gap-1.5 text-headline-lg-mobile font-semibold", accent)}>
        {icon}
        {value}
      </div>
    </div>
  );
}

function KeyRow({ item }: { item: StoredKey }) {
  const status = item.status ?? "untested";
  const meta = STATUS_META[status as keyof typeof STATUS_META];
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
      <Icon className={cn("w-4 h-4 flex-shrink-0", meta.color)} strokeWidth={1.8} />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-body-md text-white truncate">
          {maskKeyClient(item.key)}
        </div>
        {item.error && (
          <div className="text-label-sm text-error truncate">{item.error}</div>
        )}
      </div>
      {item.credits !== undefined && (
        <div className="text-label-md text-on-surface-variant flex items-center gap-1">
          <Coins className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span className="text-white tabular-nums">{item.credits}</span>
        </div>
      )}
      <button
        onClick={() => keysStore.remove(item.key)}
        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
        aria-label="Remove"
      >
        <Trash2 className="w-4 h-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}
