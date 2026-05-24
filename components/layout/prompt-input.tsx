"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  Sparkles,
  ArrowUp,
  SlidersHorizontal,
  LoaderCircle,
  Paperclip,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsSheet } from "@/components/settings/settings-provider";

export type PromptAttachment = {
  /** data:image/...;base64,... or remote https URL */
  url: string;
  /** Optional caption (filename, description). */
  alt?: string;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  loading?: boolean;
  showSettings?: boolean;

  /** When provided, an attach (paperclip) button + preview strip appear. */
  attachments?: PromptAttachment[];
  onAttach?: (files: File[]) => void;
  onRemoveAttachment?: (index: number) => void;
};

/**
 * Floating "frosted obsidian" prompt input.
 *
 * When `onAttach` is provided, a paperclip button + thumbnail strip appear.
 * Paste / drag-and-drop wiring lives in the parent — this component only
 * renders the explicit picker so it can be reused on pages that don't want
 * attachments.
 */
export function PromptInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Type to imagine",
  loading = false,
  showSettings = true,
  attachments,
  onAttach,
  onRemoveAttachment,
}: Props) {
  const sheet = useSettingsSheet();
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFiles() {
    fileRef.current?.click();
  }

  function handleFiles(list: FileList | null) {
    if (!list || !list.length || !onAttach) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (files.length) onAttach(files);
    // Reset so picking the same file again still fires onChange.
    if (fileRef.current) fileRef.current.value = "";
  }

  const showAttach = !!onAttach;
  const hasAttachments = !!attachments && attachments.length > 0;

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="flex flex-col gap-2 w-full"
    >
      {/* Attachment thumbnails strip (scrolls horizontally if many). */}
      <AnimatePresence initial={false}>
        {hasAttachments && (
          <motion.div
            key="attachments"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2 overflow-x-auto hide-scrollbar px-1"
          >
            {attachments!.map((att, i) => (
              <div
                key={i}
                className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 bg-surface-container-low"
              >
                <Image
                  src={att.url}
                  alt={att.alt || "attachment"}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
                {onRemoveAttachment && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 hover:bg-black flex items-center justify-center text-white"
                    aria-label="Remove attachment"
                  >
                    <X className="w-3 h-3" strokeWidth={2.4} />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if ((value.trim() || hasAttachments) && !loading) onSubmit();
          }}
          className="flex-1 frosted-obsidian rounded-full flex items-center px-6 py-4 group border border-outline-variant/30 transition-all focus-within:border-primary/50"
        >
          <Sparkles
            className="w-5 h-5 text-on-surface-variant mr-3 group-focus-within:text-white transition-colors"
            strokeWidth={1.8}
          />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className="w-full bg-transparent border-none text-body-md text-white placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0 p-0"
          />
          {showAttach && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={pickFiles}
                disabled={loading}
                className="ml-1 w-9 h-9 rounded-full hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-on-surface-variant hover:text-white transition-all active:scale-90"
                aria-label="Attach image"
              >
                <Paperclip className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </>
          )}
          <button
            type="submit"
            disabled={(!value.trim() && !hasAttachments) || loading}
            className="ml-1 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
            aria-label="Send"
          >
            {loading ? (
              <LoaderCircle className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="w-4 h-4 text-white" strokeWidth={2} />
            )}
          </button>
        </form>

        {showSettings && (
          <button
            type="button"
            onClick={sheet.open}
            className="w-14 h-14 rounded-full frosted-obsidian flex items-center justify-center text-white hover:text-primary transition-colors active:scale-95 border border-outline-variant/30"
            aria-label="Settings"
          >
            <SlidersHorizontal className="w-5 h-5" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
