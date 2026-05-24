"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LoaderCircle, Sparkles, ChevronRight } from "lucide-react";
import { PromptInput } from "@/components/layout/prompt-input";
import { TEMPLATES } from "@/components/studio/templates";
import { gallery, type GalleryItem, subscribeGallery } from "@/lib/store";
import { useSettings } from "@/lib/settings";
import { keysStore } from "@/lib/keys-storage";
import { cn } from "@/lib/utils";

type Tab = "ask" | "imagine";

export default function StudioPage() {
  const router = useRouter();
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>("imagine");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(gallery.list());
    sync();
    // Re-sync on in-tab mutations, cross-tab storage, bfcache restore, and
    // tab regaining focus — covers the path back from /edit/[id] without
    // requiring a manual reload.
    const unsub = subscribeGallery(sync);
    const onPageShow = () => sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsub();
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function generate(p?: string) {
    const text = (p ?? prompt).trim();
    if (!text || loading) return;
    setLoading(true);
    setPendingCount(settings.batchSize);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          model: settings.imageModel,
          aspectRatio: settings.aspectRatio,
          quality: settings.quality,
          batchSize: settings.batchSize,
          extraKeys: keysStore.rawKeys(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");

      const urls: string[] = Array.isArray(json.images)
        ? json.images
        : json.image
          ? [json.image]
          : [];
      const trimmed = urls.slice(0, settings.batchSize);

      // Each result becomes its own gallery entry so the user can edit them
      // independently. The list is sorted newest-first elsewhere.
      for (const url of trimmed) gallery.create({ url, prompt: text });
      setItems(gallery.list());
      setPrompt("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setPendingCount(0);
    }
  }

  const empty = items.length === 0;

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* Tab navigation: Ask / Imagine */}
      <nav className="flex justify-center gap-8 border-b border-white/10 pb-4">
        {(["ask", "imagine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => (t === "ask" ? router.push("/chat") : setTab(t))}
            className={cn(
              "relative text-label-md transition-colors capitalize",
              tab === t ? "text-white font-bold" : "text-on-surface-variant hover:text-white"
            )}
          >
            {t}
            {tab === t && (
              <motion.div
                layoutId="tab-underline"
                className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white"
              />
            )}
          </button>
        ))}
      </nav>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-error/40 bg-error-container/30 px-4 py-3 text-error text-label-md"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates rail. Hidden once you've generated something so the surface
          stays focused on the user's own content. */}
      {empty && !loading && (
        <section>
          <h2 className="text-body-md text-white mb-4">Create from Template</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x -mx-margin-mobile md:mx-0 px-margin-mobile md:px-0 lg:grid lg:grid-cols-4 xl:grid-cols-5 lg:overflow-visible lg:px-0">
            {TEMPLATES.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => generate(t.prompt)}
                disabled={loading}
                className="w-32 h-48 lg:w-full lg:h-56 flex-shrink-0 lg:flex-shrink overflow-hidden relative razor-edge glow-hover transition-all cursor-pointer snap-start group rounded-2xl bg-surface-container-high"
              >
                {t.thumb ? (
                  <Image
                    src={t.thumb}
                    alt={t.title}
                    width={128}
                    height={192}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white/40" strokeWidth={1.5} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute bottom-3 left-3 text-body-md text-white z-10 font-medium leading-tight whitespace-pre-line text-left">
                  {t.title}
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {empty && !loading && (
        <section className="flex flex-col items-center justify-center text-center gap-4 py-12">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <p className="text-body-md text-white">Type to imagine</p>
            <p className="text-label-md text-on-surface-variant max-w-xs">
              Generates {settings.batchSize} {settings.batchSize === 1 ? "image" : "images"} per
              prompt at {settings.aspectRatio}.
            </p>
          </div>
        </section>
      )}

      {(!empty || loading) && (
        <section>
          <header className="flex items-end justify-between mb-3">
            <h2 className="text-body-md text-white">Your generations</h2>
            <Link
              href="/vault"
              className="text-label-sm text-on-surface-variant hover:text-white tracking-widest flex items-center gap-1"
            >
              See All <ChevronRight className="w-3 h-3" strokeWidth={2} />
            </Link>
          </header>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1 border border-white/5 bg-surface-container-lowest overflow-hidden rounded-2xl">
            {Array.from({ length: pendingCount }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="relative aspect-square overflow-hidden bg-surface-container-low"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer bg-[length:200%_100%]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoaderCircle
                    className="w-6 h-6 text-white/40 animate-spin"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            ))}
            {items.map((item) => (
              <GridItem key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <div className="fixed left-0 right-0 z-40 px-margin-mobile md:px-margin-desktop max-w-2xl mx-auto bottom-[110px] lg:bottom-8 lg:left-60">
        <PromptInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={() => generate()}
          loading={loading}
        />
      </div>
    </div>
  );
}

function GridItem({ item }: { item: GalleryItem }) {
  const v = item.versions[item.activeIndex] ?? item.versions[0];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        href={`/edit/${item.id}`}
        className="relative aspect-square overflow-hidden group cursor-pointer block"
      >
        <Image
          src={v.url}
          alt={v.prompt}
          width={600}
          height={600}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    </motion.div>
  );
}
