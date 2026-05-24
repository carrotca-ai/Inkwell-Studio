"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Video, LoaderCircle } from "lucide-react";
import { gallery, type GalleryItem, subscribeGallery } from "@/lib/store";
import { useSettings } from "@/lib/settings";
import { keysStore } from "@/lib/keys-storage";
import { PromptInput } from "@/components/layout/prompt-input";
import { cn } from "@/lib/utils";

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const settings = useSettings();
  const [item, setItem] = useState<GalleryItem | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const found = gallery.get(id);
      if (!found) {
        router.replace("/");
        return;
      }
      setItem(found);
      setActiveIndex(found.activeIndex);
    };
    sync();
    const unsub = subscribeGallery(sync);
    const onPageShow = () => sync();
    window.addEventListener("pageshow", onPageShow);
    return () => {
      unsub();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [id, router]);

  const active = useMemo(
    () => (item ? item.versions[activeIndex] : null),
    [item, activeIndex]
  );

  function changeActive(i: number) {
    if (!item) return;
    setActiveIndex(i);
    gallery.setActive(item.id, i);
    setVideo(null);
  }

  /** Move to the next/previous version, clamped to the array bounds. */
  function step(direction: 1 | -1) {
    if (!item) return;
    const next = activeIndex + direction;
    if (next < 0 || next >= item.versions.length) return;
    changeActive(next);
  }

  // Either a long offset OR a fast flick triggers a swipe. The combined power
  // heuristic catches medium-effort gestures that miss both bars individually.
  const SWIPE_OFFSET = 60;
  const SWIPE_VELOCITY = 400;

  function onSwipeEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (video) return;
    if (!item || item.versions.length < 2) return;
    const power = Math.abs(info.offset.x) * Math.abs(info.velocity.x);
    const fast = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
    const long = Math.abs(info.offset.x) > SWIPE_OFFSET;
    if (!fast && !long && power < 6000) return;
    if (info.offset.x < 0) step(1);
    else step(-1);
  }

  async function editImage() {
    if (!item || !active || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image: active.url,
          model: settings.imageEditModel || settings.imageModel,
          aspectRatio: settings.aspectRatio,
          quality: settings.quality,
          extraKeys: keysStore.rawKeys(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Edit failed");
      const updated = gallery.addVersion(item.id, { url: json.image, prompt });
      if (updated) {
        setItem(updated);
        setActiveIndex(updated.versions.length - 1);
      }
      if (json.keyUsed) {
        setInfo(`Used ${json.keyUsed}${json.attempted > 1 ? ` (${json.attempted} tries)` : ""}`);
        setTimeout(() => setInfo(null), 3000);
      }
      setPrompt("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function makeVideo() {
    if (!active) return;
    setVideoLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: active.url,
          prompt: active.prompt,
          model: settings.videoModel,
          extraKeys: keysStore.rawKeys(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Video failed");
      setVideo(json.video);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVideoLoading(false);
    }
  }

  function downloadActive() {
    if (!active) return;
    const a = document.createElement("a");
    a.href = active.url;
    a.download = `neural-studio-${item?.id ?? "image"}.png`;
    a.click();
  }

  if (!item || !active) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <LoaderCircle className="w-6 h-6 animate-spin text-on-surface-variant" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 bg-black flex flex-col lg:left-60">
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeIndex + (video ? ":v" : ":i")}
            drag={video ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onSwipeEnd}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 touch-pan-y lg:flex lg:items-center lg:justify-center lg:p-8"
          >
            {video ? (
              <video
                src={video}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover lg:w-auto lg:h-auto lg:max-w-3xl lg:max-h-full lg:object-contain lg:rounded-3xl"
              />
            ) : (
              <>
                {/* Mobile: edge-to-edge fill. */}
                <div className="absolute inset-0 lg:hidden">
                  <Image
                    src={active.url}
                    alt={active.prompt}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    unoptimized
                    priority
                  />
                </div>
                {/* Desktop: contained, max 3xl, rounded. */}
                <img
                  src={active.url}
                  alt={active.prompt}
                  draggable={false}
                  className="hidden lg:block max-w-3xl max-h-full w-auto h-auto object-contain rounded-3xl select-none"
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Back button — placed below the global top-bar (top-4 + h-16). */}
        <div className="absolute z-10 top-24 lg:top-8 left-0 lg:left-0 right-0 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface-container-low/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-6 flex flex-col gap-4 lg:max-w-3xl lg:mx-auto lg:px-8">
          {error && (
            <div className="rounded-2xl border border-error/40 bg-error-container/40 px-4 py-2 text-error text-label-md backdrop-blur-md">
              {error}
            </div>
          )}
          {info && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-white/10 bg-surface-container-low/60 px-4 py-2 text-label-sm text-on-surface-variant backdrop-blur-md"
            >
              {info}
            </motion.div>
          )}

          <div className="flex justify-between items-end">
            <button
              onClick={makeVideo}
              disabled={videoLoading || loading}
              className="frosted-obsidian rounded-full px-4 py-2.5 flex items-center gap-2 text-white text-label-md font-medium active:scale-95 transition-transform disabled:opacity-50"
            >
              {videoLoading ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <Video className="w-4 h-4" strokeWidth={1.8} />
              )}
              Make Video
            </button>
            <button
              onClick={downloadActive}
              className="w-12 h-12 rounded-full frosted-obsidian border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
              aria-label="Download"
            >
              <Download className="w-5 h-5" strokeWidth={1.8} />
            </button>
          </div>

          <p className="text-on-surface-variant text-label-md line-clamp-2">
            <span className="text-white font-medium">Prompt: </span>
            {active.prompt}
          </p>

          {item.versions.length > 1 && (
            <div className="flex justify-center items-center gap-2 py-1">
              {item.versions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => changeActive(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === activeIndex ? "w-8 bg-white" : "w-2 bg-white/30 hover:bg-white/60"
                  )}
                  aria-label={`Version ${i + 1}`}
                />
              ))}
            </div>
          )}

          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={editImage}
            placeholder="Type to edit image"
            loading={loading}
            showSettings={false}
          />
        </div>
      </div>
    </div>
  );
}
