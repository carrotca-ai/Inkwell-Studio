"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RotateCcw,
  Sparkles,
  Pencil,
  MessageSquare,
  Video,
  Volume2,
  KeyRound,
  Sliders,
  Grid2x2,
  Crop,
  Zap,
} from "lucide-react";
import {
  DEFAULT_SETTINGS,
  getSettings,
  resetSettings,
  setSettings,
  type Settings,
} from "@/lib/settings";
import { cn } from "@/lib/utils";
import { KeysManager } from "./keys-manager";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Tab = "keys" | "models";

const FIELDS: Array<{
  key: keyof Settings;
  label: string;
  hint: string;
  icon: typeof Sparkles;
  placeholder: string;
}> = [
  {
    key: "imageModel",
    label: "Image generation",
    hint: "Text → Image. Default uses kie.ai grok-imagine on the server.",
    icon: Sparkles,
    placeholder: "(server default)",
  },
  {
    key: "imageEditModel",
    label: "Image editing",
    hint: "Image + text → image. Empty = same as generation.",
    icon: Pencil,
    placeholder: "(server default)",
  },
  {
    key: "chatModel",
    label: "Chat",
    hint: "Used by /chat. Empty falls back to OpenRouter free Gemma.",
    icon: MessageSquare,
    placeholder: "google/gemma-4-31b-it:free",
  },
  {
    key: "videoModel",
    label: "Image → Video",
    hint: "Make Video button. Empty hides the button.",
    icon: Video,
    placeholder: "(server default)",
  },
  {
    key: "ttsModel",
    label: "Text → Speech",
    hint: "Optional. Empty hides voice features.",
    icon: Volume2,
    placeholder: "(unset)",
  },
];

export function SettingsSheet({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("keys");
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (open) setDraft(getSettings());
  }, [open]);

  function saveModels() {
    setSettings(draft);
    onClose();
  }

  function reset() {
    resetSettings();
    setDraft(DEFAULT_SETTINGS);
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
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[61] bg-surface-container-low/95 backdrop-blur-2xl rounded-t-[2rem] border-t border-x border-white/10 max-h-[92dvh] overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-gradient-to-b from-surface-container-low/95 to-surface-container-low/80 backdrop-blur-2xl pt-3 pb-2 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pb-10 pt-2 max-w-container-max mx-auto md:px-margin-desktop">
              {/* Header */}
              <header className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-headline-lg-mobile font-semibold tracking-tight">
                    Settings
                  </h2>
                  <p className="text-label-md text-on-surface-variant mt-1">
                    Pool of kie.ai keys + model overrides. All client-side.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-surface-container-high/60 border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" strokeWidth={1.8} />
                </button>
              </header>

              {/* Tabs */}
              <div className="inline-flex gap-1 p-1 rounded-full bg-surface-container-lowest/80 border border-white/10 mb-6">
                <TabButton active={tab === "keys"} onClick={() => setTab("keys")} icon={KeyRound}>
                  Keys
                </TabButton>
                <TabButton active={tab === "models"} onClick={() => setTab("models")} icon={Sliders}>
                  Models
                </TabButton>
              </div>

              {tab === "keys" && <KeysManager />}

              {tab === "models" && (
                <>
                  <div className="flex flex-col gap-5">
                    {/* Generation parameters — these affect every /api/generate
                        call and, where applicable, /api/edit + /api/video. */}
                    <div className="rounded-2xl border border-white/10 bg-surface-container-lowest/40 p-4 flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-on-surface-variant" strokeWidth={1.8} />
                        <span className="text-body-md font-medium text-white">Generation</span>
                      </div>

                      {/* Batch size */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Grid2x2 className="w-3.5 h-3.5 text-on-surface-variant" strokeWidth={1.8} />
                          <span className="text-label-md text-white">Images per prompt</span>
                          <span className="ml-auto text-label-sm text-on-surface-variant tabular-nums">
                            {draft.batchSize}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 p-1 rounded-full bg-surface-container-lowest/80 border border-white/10">
                          {([1, 2, 3, 4] as const).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setDraft({ ...draft, batchSize: n })}
                              className={cn(
                                "py-1.5 rounded-full text-label-md transition-all tabular-nums",
                                draft.batchSize === n
                                  ? "bg-white text-black"
                                  : "text-on-surface-variant hover:text-white"
                              )}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <p className="text-label-sm text-on-surface-variant -mt-0.5">
                          Grok Imagine returns 4 images per task; the rest are discarded.
                        </p>
                      </div>

                      {/* Aspect ratio */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Crop className="w-3.5 h-3.5 text-on-surface-variant" strokeWidth={1.8} />
                          <span className="text-label-md text-white">Aspect ratio</span>
                        </div>
                        <div className="flex flex-wrap gap-1 p-1 rounded-full bg-surface-container-lowest/80 border border-white/10">
                          {(["1:1", "2:3", "3:2", "16:9", "9:16"] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setDraft({ ...draft, aspectRatio: r })}
                              className={cn(
                                "flex-1 py-1.5 rounded-full text-label-md transition-all",
                                draft.aspectRatio === r
                                  ? "bg-white text-black"
                                  : "text-on-surface-variant hover:text-white"
                              )}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quality toggle */}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Zap className="w-3.5 h-3.5 text-on-surface-variant" strokeWidth={1.8} />
                        <div className="flex-1">
                          <div className="text-label-md text-white">Pro quality</div>
                          <div className="text-label-sm text-on-surface-variant">
                            Slower, sharper output (kie.ai enable_pro).
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDraft({ ...draft, quality: !draft.quality })}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative flex-shrink-0",
                            draft.quality ? "bg-white" : "bg-white/20"
                          )}
                          aria-pressed={draft.quality}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 w-5 h-5 rounded-full transition-all",
                              draft.quality
                                ? "left-[calc(100%-1.375rem)] bg-black"
                                : "left-0.5 bg-white"
                            )}
                          />
                        </button>
                      </label>
                    </div>

                    {FIELDS.map((f) => {
                      const Icon = f.icon;
                      return (
                        <label key={f.key} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              className="w-4 h-4 text-on-surface-variant"
                              strokeWidth={1.8}
                            />
                            <span className="text-body-md font-medium text-white">{f.label}</span>
                          </div>
                          <p className="text-label-sm text-on-surface-variant -mt-1">
                            {f.hint}
                          </p>
                          <input
                            value={(draft[f.key] as string) ?? ""}
                            onChange={(e) =>
                              setDraft({ ...draft, [f.key]: e.target.value })
                            }
                            placeholder={f.placeholder}
                            spellCheck={false}
                            autoCapitalize="off"
                            autoCorrect="off"
                            className={cn(
                              "w-full bg-surface-container-lowest border border-white/10 rounded-2xl px-4 py-3",
                              "text-body-md font-mono text-white placeholder:text-on-surface-variant/40",
                              "focus:outline-none focus:border-white/30 transition-colors"
                            )}
                          />
                        </label>
                      );
                    })}

                    <label className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-on-surface-variant" strokeWidth={1.8} />
                        <span className="text-body-md font-medium text-white">System prompt</span>
                      </div>
                      <p className="text-label-sm text-on-surface-variant -mt-1">
                        Optional. Prepended to chat conversations.
                      </p>
                      <textarea
                        value={draft.systemPrompt}
                        onChange={(e) =>
                          setDraft({ ...draft, systemPrompt: e.target.value })
                        }
                        rows={3}
                        placeholder="You are a witty, concise assistant..."
                        className="w-full bg-surface-container-lowest border border-white/10 rounded-2xl px-4 py-3 text-body-md text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-white/30 transition-colors resize-none"
                      />
                    </label>
                  </div>

                  <div className="sticky bottom-0 mt-8 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-surface-container-low/95 via-surface-container-low/95 to-transparent flex gap-3">
                    <button
                      onClick={reset}
                      className="px-4 py-3 rounded-full border border-white/10 bg-surface-container-high/40 text-on-surface-variant hover:text-white text-label-md flex items-center gap-2 active:scale-95 transition-transform"
                    >
                      <RotateCcw className="w-4 h-4" strokeWidth={1.8} />
                      Reset
                    </button>
                    <button
                      onClick={saveModels}
                      className="flex-1 py-3 rounded-full bg-white text-black text-label-md font-semibold active:scale-[0.98] transition-transform"
                    >
                      Save
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-label-md flex items-center gap-2 transition-all",
        active
          ? "bg-white text-black"
          : "text-on-surface-variant hover:text-white"
      )}
    >
      <Icon className="w-4 h-4" strokeWidth={1.8} />
      {children}
    </button>
  );
}
