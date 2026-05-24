"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Upload, LoaderCircle } from "lucide-react";
import { PromptInput } from "@/components/layout/prompt-input";
import { fileToDataUrl } from "@/lib/utils";
import { gallery } from "@/lib/store";
import { useSettings } from "@/lib/settings";
import { keysStore } from "@/lib/keys-storage";

export default function EditorPage() {
  const router = useRouter();
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataUrl(f);
    setImage(url);
  }

  async function edit() {
    if (!image || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          prompt,
          model: settings.imageEditModel || settings.imageModel,
          extraKeys: keysStore.rawKeys(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Edit failed");

      const item = gallery.create({ url: image, prompt: "Original" });
      const updated = gallery.addVersion(item.id, { url: json.image, prompt });
      router.push(`/edit/${updated?.id ?? item.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-semibold tracking-tight">Editor</h1>
          <p className="text-label-md text-on-surface-variant mt-1">
            Upload an image and describe the change
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-error/40 bg-error-container/30 px-4 py-3 text-error text-label-md">
          {error}
        </div>
      )}

      {!image ? (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => fileRef.current?.click()}
          className="aspect-square w-full max-w-md lg:max-w-lg mx-auto rounded-3xl border-2 border-dashed border-white/10 bg-surface-container-low/40 hover:border-white/30 hover:bg-surface-container-low/60 flex flex-col items-center justify-center gap-3 text-on-surface-variant transition-colors"
        >
          <Upload className="w-8 h-8" strokeWidth={1.5} />
          <span className="text-body-md">Click or tap to upload an image</span>
          <span className="text-label-sm">PNG, JPG, WEBP up to ~5 MB</span>
        </motion.button>
      ) : (
        <div className="relative aspect-square w-full max-w-md lg:max-w-lg mx-auto rounded-3xl overflow-hidden razor-edge bg-surface-container-lowest">
          <Image src={image} alt="" fill sizes="500px" className="object-cover" unoptimized />
          {loading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <LoaderCircle className="w-8 h-8 animate-spin text-white" />
            </div>
          )}
          <button
            onClick={() => setImage(null)}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-surface-container-low/80 backdrop-blur-md border border-white/10 text-label-sm text-white"
          >
            Change
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />

      <div className="fixed left-0 right-0 z-40 px-margin-mobile md:px-margin-desktop max-w-2xl mx-auto bottom-[110px] lg:bottom-8 lg:left-60">
        <PromptInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={edit}
          placeholder={image ? "Describe the edit" : "Upload an image first"}
          loading={loading}
          showSettings={false}
        />
      </div>
    </div>
  );
}
