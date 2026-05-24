"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LoaderCircle,
  Sparkles,
  History,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Bot,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PromptInput, type PromptAttachment } from "@/components/layout/prompt-input";
import { gallery } from "@/lib/store";
import { useSettings } from "@/lib/settings";
import { keysStore } from "@/lib/keys-storage";
import {
  chatsStore,
  getActiveId,
  newMessageId,
  setActiveId,
  type ChatAttachment,
  type ChatImageSlot,
  type ChatMessage,
} from "@/lib/chats";
import { ChatHistorySheet } from "@/components/chat/history-sheet";
import { cn } from "@/lib/utils";

type ImageSlot = ChatImageSlot;
type Msg = ChatMessage;

const SUGGESTIONS = [
  "Generate a cinematic shot of a foggy forest at dawn",
  "Design a minimalist logo for a coffee shop",
  "Storyboard a chase scene through a neon-lit city",
  "Show me three colour variations of an art-deco poster",
];

export default function ChatPage() {
  const router = useRouter();
  const settings = useSettings();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getActiveId();
    if (!id) return;
    const found = chatsStore.get(id);
    if (found) {
      setChatId(found.id);
      setMessages(found.messages);
    }
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const saved = chatsStore.save({ id: chatId ?? undefined, messages });
    if (saved && saved.id !== chatId) {
      setChatId(saved.id);
      setActiveId(saved.id);
    } else if (saved) {
      setActiveId(saved.id);
    }
  }, [messages, chatId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  }

  async function attachFiles(files: File[]) {
    const next: PromptAttachment[] = [];
    for (const f of files) {
      try {
        const url = await fileToDataUrl(f);
        next.push({ url, alt: f.name });
      } catch {
        /* skip unreadable file */
      }
    }
    if (next.length) setAttachments((cur) => [...cur, ...next]);
  }

  function removeAttachment(index: number) {
    setAttachments((cur) => cur.filter((_, i) => i !== index));
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        void attachFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const [dragActive, setDragActive] = useState(false);
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      setDragActive(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragActive(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length) void attachFiles(files);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  function newChat() {
    setMessages([]);
    setChatId(null);
    setActiveId(null);
    setInput("");
    setAttachments([]);
  }

  function openChat(id: string) {
    const found = chatsStore.get(id);
    if (!found) return;
    setChatId(id);
    setMessages(found.messages);
    setActiveId(id);
    setInput("");
    setAttachments([]);
  }

  /**
   * Patch by stable message id, never by index. The message at index N may
   * shift between when a turn starts and when its image slots resolve.
   */
  function patchSlot(messageId: string, slotIndex: number, patch: Partial<ImageSlot>) {
    setMessages((all) => {
      const idx = all.findIndex((m) => m.id === messageId);
      if (idx < 0) return all;
      const m = all[idx]!;
      if (m.role !== "assistant" || !m.images) return all;
      const images = [...m.images];
      images[slotIndex] = { ...images[slotIndex]!, ...patch };
      const next = [...all];
      next[idx] = { ...m, images };
      return next;
    });
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    const hasAttachments = attachments.length > 0;
    if ((!text && !hasAttachments) || loading) return;
    const userTurn: Msg = {
      id: newMessageId(),
      role: "user",
      content: text,
      attachments: hasAttachments
        ? attachments.map<ChatAttachment>((a) => ({ url: a.url, alt: a.alt }))
        : undefined,
    };
    const history = [...messages, userTurn];
    setMessages(history);
    setInput("");
    setAttachments([]);
    await runTurn(history);
  }

  async function regenerate() {
    if (loading) return;
    let cut = messages.length;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === "assistant") {
        cut = i;
        break;
      }
    }
    if (cut === messages.length) return;
    const trimmed = messages.slice(0, cut);
    if (!trimmed.length || trimmed[trimmed.length - 1]!.role !== "user") return;
    setMessages(trimmed);
    await runTurn(trimmed);
  }

  const runTurn = useCallback(
    async (history: Msg[]) => {
      setLoading(true);
      const assistantId = newMessageId();
      let slotsCount = 0;
      let appended = false;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) =>
              m.role === "user"
                ? {
                    role: "user",
                    content: m.content,
                    attachments: m.attachments,
                  }
                : {
                    role: "assistant",
                    content: m.content,
                    images: m.images,
                  }
            ),
            model: settings.chatModel,
            systemPrompt: settings.systemPrompt,
          }),
        });
        const json = (await res.json()) as {
          text?: string;
          imageRequests?: Array<{ prompt: string; aspect_ratio: string }>;
          editRequests?: Array<{
            image_id: string;
            image_url: string;
            prompt: string;
            aspect_ratio: string;
          }>;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            formatChatError(res.status, json.error) ||
              `Chat failed (${res.status})`
          );
        }

        const genRequests = json.imageRequests ?? [];
        const editReqs = json.editRequests ?? [];
        const slots: ImageSlot[] = [
          ...genRequests.map<ImageSlot>((r) => ({
            prompt: r.prompt,
            aspectRatio: r.aspect_ratio || "1:1",
            status: "pending",
          })),
          ...editReqs.map<ImageSlot>((r) => ({
            prompt: r.prompt,
            aspectRatio: r.aspect_ratio || "1:1",
            status: "pending",
          })),
        ];
        slotsCount = slots.length;

        const trimmedText = (json.text ?? "").trim();
        const text =
          trimmedText ||
          (slots.length === 0 ? "(no response)" : "");

        setMessages((m) => [
          ...m,
          {
            id: assistantId,
            role: "assistant",
            content: text,
            images: slots.length ? slots : undefined,
          },
        ]);
        appended = true;
        setLoading(false);

        if (slots.length) {
          const extraKeys = keysStore.rawKeys();

          const runOneGenerate = async (
            slotIndex: number,
            req: { prompt: string; aspect_ratio: string }
          ) => {
            try {
              const gen = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: req.prompt,
                  aspectRatio: req.aspect_ratio,
                  quality: settings.quality,
                  batchSize: 1,
                  extraKeys,
                }),
              });
              const genJson = await gen.json();
              if (!gen.ok) throw new Error(genJson.error || "Generation failed");
              const url: string | undefined = genJson.image;
              if (!url) throw new Error("Empty generation");
              const item = gallery.create({ url, prompt: req.prompt });
              patchSlot(assistantId, slotIndex, {
                status: "ready",
                url,
                galleryId: item.id,
              });
            } catch (e) {
              patchSlot(assistantId, slotIndex, {
                status: "error",
                error: (e as Error).message || "Generation failed",
              });
            }
          };

          const runOneEdit = async (
            slotIndex: number,
            req: {
              image_id: string;
              image_url: string;
              prompt: string;
              aspect_ratio: string;
            }
          ) => {
            try {
              const ed = await fetch("/api/edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: req.prompt,
                  image: req.image_url,
                  aspectRatio: req.aspect_ratio,
                  quality: settings.quality,
                  extraKeys,
                }),
              });
              const edJson = await ed.json();
              if (!ed.ok) throw new Error(edJson.error || "Edit failed");
              const url: string | undefined = edJson.image;
              if (!url) throw new Error("Empty edit result");
              const item = gallery.create({ url, prompt: req.prompt });
              patchSlot(assistantId, slotIndex, {
                status: "ready",
                url,
                galleryId: item.id,
              });
            } catch (e) {
              patchSlot(assistantId, slotIndex, {
                status: "error",
                error: (e as Error).message || "Edit failed",
              });
            }
          };

          const generateTasks = genRequests.map((r, i) => runOneGenerate(i, r));
          const offset = genRequests.length;
          const editTasks = editReqs.map((r, i) => runOneEdit(offset + i, r));
          await Promise.all([...generateTasks, ...editTasks]);
        }
      } catch (e) {
        const errMsg = (e as Error).message || "Unknown error";
        if (appended && slotsCount > 0) {
          for (let i = 0; i < slotsCount; i++) {
            patchSlot(assistantId, i, { status: "error", error: errMsg });
          }
        } else {
          setMessages((m) => [
            ...m,
            {
              id: newMessageId(),
              role: "assistant",
              content: `⚠ ${errMsg}`,
            },
          ]);
        }
      } finally {
        setLoading(false);
      }
    },
    [settings.chatModel, settings.systemPrompt, settings.quality]
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-260px)] lg:h-[calc(100dvh-80px)] relative w-full lg:max-w-none lg:overflow-hidden">
      {/* Header — sticky on desktop, integrated with the conversation */}
      <header className="hidden lg:flex items-center justify-between mb-4 px-1 mx-auto w-full max-w-3xl">
        <div>
          <h1 className="text-headline-lg-mobile font-semibold tracking-tight text-white">
            Chat
          </h1>
          <p className="text-label-sm text-on-surface-variant mt-0.5">
            {messages.length === 0
              ? "Start a new conversation"
              : `${messages.length} ${messages.length === 1 ? "message" : "messages"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHistoryOpen(true)}
            className="px-4 h-9 rounded-full bg-surface-container-high/50 hover:bg-surface-container-high border border-white/10 text-label-md text-white flex items-center gap-2 transition-colors"
          >
            <History className="w-4 h-4" strokeWidth={1.8} />
            History
          </button>
          <button
            onClick={newChat}
            disabled={!messages.length}
            className="h-9 w-9 rounded-full bg-surface-container-high/50 hover:bg-surface-container-high border border-white/10 text-white flex items-center justify-center transition-colors disabled:opacity-40"
            aria-label="New chat"
            title="New chat"
          >
            <Plus className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Mobile toolbar — floats over the chat */}
      <div className="lg:hidden absolute top-1 right-0 z-20 flex items-center gap-1.5">
        <button
          onClick={() => setHistoryOpen(true)}
          className="px-3 h-8 rounded-full bg-surface-container-high/70 border border-white/10 backdrop-blur-md text-label-sm text-white flex items-center gap-1.5 active:scale-95 transition-transform"
          aria-label="Chat history"
        >
          <History className="w-3.5 h-3.5" strokeWidth={1.8} />
          History
        </button>
        <button
          onClick={newChat}
          disabled={!messages.length}
          className="w-8 h-8 rounded-full bg-surface-container-high/70 border border-white/10 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
          aria-label="New chat"
          title="New chat"
        >
          <Plus className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </div>

      <ChatHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeId={chatId}
        onSelect={openChat}
        onNew={newChat}
      />

      {/* Top fade — masks scroll under the floating top-bar / sticky header */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background via-background/80 to-transparent z-10 lg:hidden" />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-1 -mr-1 scroll-smooth pt-12 pb-8 lg:pt-2 lg:pb-0"
      >
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-4 lg:gap-8">
          {messages.length === 0 && !loading && <EmptyState onPick={(s) => send(s)} />}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const isLastAssistant =
                m.role === "assistant" && i === messages.length - 1;
              return (
                <MessageRow
                  key={m.id}
                  message={m}
                  isLastAssistant={isLastAssistant}
                  loading={loading}
                  onRegenerate={regenerate}
                  onOpenImage={(galleryId) => router.push(`/edit/${galleryId}`)}
                />
              );
            })}
          </AnimatePresence>

          {loading && (
            <div className="flex items-start gap-3">
              <Avatar role="assistant" />
              <div className="flex items-center gap-2 text-on-surface-variant pt-1.5">
                <span className="inline-flex gap-1">
                  <Dot delay={0} />
                  <Dot delay={0.15} />
                  <Dot delay={0.3} />
                </span>
                <span className="text-label-sm">Thinking…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile prompt — floating */}
      <div className="lg:hidden fixed left-0 right-0 z-40 px-margin-mobile max-w-2xl mx-auto bottom-[110px]">
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={() => send()}
          placeholder="Ask anything"
          loading={loading}
          showSettings={false}
          attachments={attachments}
          onAttach={attachFiles}
          onRemoveAttachment={removeAttachment}
        />
      </div>

      {/* Desktop prompt — inline at the bottom of the chat column with a soft
          gradient fade above so scrolled text doesn't crash into it. */}
      <div className="hidden lg:block sticky bottom-0 left-0 right-0">
        <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
        <div className="mx-auto w-full max-w-3xl pb-2">
          <PromptInput
            value={input}
            onChange={setInput}
            onSubmit={() => send()}
            placeholder="Ask anything"
            loading={loading}
            showSettings={false}
            attachments={attachments}
            onAttach={attachFiles}
            onRemoveAttachment={removeAttachment}
          />
        </div>
      </div>

      <AnimatePresence>
        {dragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[55] pointer-events-none flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="px-6 py-4 rounded-2xl border-2 border-dashed border-white/40 bg-surface-container/80 text-white text-body-md">
              Drop image to attach
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-12 lg:py-24 text-on-surface-variant">
      <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-white" strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <p className="text-headline-lg-mobile font-semibold text-white tracking-tight">
          What should we make?
        </p>
        <p className="text-body-md max-w-md">
          Ask anything, attach a picture, or pick a starting point below.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 w-full max-w-xl mt-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left px-4 py-3 rounded-2xl border border-white/10 bg-surface-container-low/40 hover:bg-surface-container-low/80 hover:border-white/20 text-label-md text-white transition-all active:scale-[0.99]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.2, repeat: Infinity, delay }}
      className="inline-block w-1.5 h-1.5 rounded-full bg-white/70"
    />
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div className="hidden lg:flex w-8 h-8 mt-0.5 rounded-full bg-secondary-container border border-white/10 flex-shrink-0 items-center justify-center text-label-sm font-semibold text-white">
        Y
      </div>
    );
  }
  return (
    <div className="hidden lg:flex w-8 h-8 mt-0.5 rounded-full bg-surface-container-high border border-white/10 flex-shrink-0 items-center justify-center text-white">
      <Bot className="w-4 h-4" strokeWidth={1.8} />
    </div>
  );
}

function MessageRow({
  message,
  isLastAssistant,
  loading,
  onRegenerate,
  onOpenImage,
}: {
  message: Msg;
  isLastAssistant: boolean;
  loading: boolean;
  onRegenerate: () => void;
  onOpenImage: (galleryId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  function copy() {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const showActions =
    !isUser && message.content && (isLastAssistant ? !loading : true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group flex gap-3 lg:gap-4",
        // Mobile: bubbles stay aligned to their side. Desktop: messages flow
        // in the same column with avatars on the left, like Claude / ChatGPT.
        "flex-col lg:flex-row",
        isUser ? "items-end lg:items-start" : "items-start"
      )}
    >
      <Avatar role={message.role} />

      <div
        className={cn(
          "flex flex-col gap-2 min-w-0",
          // Mobile: width is constrained, content right/left aligned.
          // Desktop: full column width, content left aligned for both roles.
          "lg:flex-1 lg:max-w-none",
          isUser ? "items-end lg:items-start" : "items-start"
        )}
      >
        {/* Author label on desktop only */}
        <span className="hidden lg:block text-label-sm font-semibold text-white">
          {isUser ? "You" : "Assistant"}
        </span>

        {(isUser || message.content) && (message.content || isUser) && (
          <div
            className={cn(
              // Mobile bubbles
              "max-w-[85%] rounded-2xl px-4 py-3 lg:max-w-none lg:rounded-none lg:px-0 lg:py-0 lg:bg-transparent",
              isUser
                ? "bg-secondary-container text-white lg:text-on-surface-variant"
                : "bg-surface-container/80 text-white"
            )}
          >
            {message.content ? (
              <MessageBody role={message.role} content={message.content} />
            ) : (
              <p className="text-label-md text-on-surface-variant italic">
                {isUser ? "(image only)" : ""}
              </p>
            )}
          </div>
        )}

        {/* User attachments */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap gap-2",
              "max-w-[85%] justify-end lg:max-w-md lg:justify-start"
            )}
          >
            {message.attachments.map((att, i) => (
              <div
                key={i}
                className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-surface-container-low"
              >
                <Image
                  src={att.url}
                  alt={att.alt || "attachment"}
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        {/* Assistant images */}
        {!isUser && message.images && message.images.length > 0 && (
          <div className="max-w-[85%] w-full lg:max-w-2xl">
            <ImageStrip slots={message.images} onOpen={onOpenImage} />
          </div>
        )}

        {/* Action row — visible on hover on desktop, always on mobile if last. */}
        {showActions && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1 transition-opacity",
              isLastAssistant
                ? "opacity-100"
                : "opacity-0 lg:group-hover:opacity-100"
            )}
          >
            <button
              onClick={copy}
              className="px-2.5 h-7 rounded-full hover:bg-white/[0.06] text-label-sm text-on-surface-variant hover:text-white flex items-center gap-1.5 transition-colors"
              title="Copy"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-400" strokeWidth={2} />
              ) : (
                <Copy className="w-3 h-3" strokeWidth={1.8} />
              )}
              <span className="hidden lg:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
            {isLastAssistant && (
              <button
                onClick={onRegenerate}
                className="px-2.5 h-7 rounded-full hover:bg-white/[0.06] text-label-sm text-on-surface-variant hover:text-white flex items-center gap-1.5 transition-colors"
                title="Regenerate"
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.8} />
                <span className="hidden lg:inline">Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MessageBody({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  if (role === "user") {
    return <p className="whitespace-pre-wrap text-body-md">{content}</p>;
  }
  return (
    <div className="markdown text-body-md leading-relaxed text-on-surface">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-headline-lg-mobile font-semibold mt-2 mb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-body-lg font-semibold mt-2 mb-1">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-body-md font-semibold mt-2 mb-1">{children}</h3>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-white/40 underline-offset-2 hover:decoration-white"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <pre className="my-2 p-3 rounded-md bg-black/40 border border-white/10 overflow-x-auto text-label-md font-mono text-white/90">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-white text-[0.9em] font-mono">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/20 pl-3 my-2 italic text-on-surface-variant">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-white/10" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function ImageStrip({
  slots,
  onOpen,
}: {
  slots: ImageSlot[];
  onOpen: (galleryId: string) => void;
}) {
  const cols = slots.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={cn("grid gap-2 w-full", cols)}>
      {slots.map((slot, i) => (
        <ImageTile key={i} slot={slot} onOpen={onOpen} />
      ))}
    </div>
  );
}

function ImageTile({
  slot,
  onOpen,
}: {
  slot: ImageSlot;
  onOpen: (galleryId: string) => void;
}) {
  const aspectClass = ratioToClass(slot.aspectRatio);

  if (slot.status === "pending") {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl bg-surface-container-low min-h-[10rem]",
          aspectClass
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-shimmer bg-[length:200%_100%]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
          <LoaderCircle className="w-5 h-5 text-white/50 animate-spin" strokeWidth={1.5} />
          <p className="text-label-sm text-on-surface-variant line-clamp-3">
            {slot.prompt}
          </p>
        </div>
      </div>
    );
  }

  if (slot.status === "error") {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-error/40 bg-error-container/20 flex flex-col items-center justify-center gap-1.5 p-3 min-h-[7rem]",
          aspectClass
        )}
      >
        <p className="text-label-md text-error font-medium">Generation failed</p>
        <p className="text-label-sm text-error/80 text-center break-words">
          {slot.error || "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => slot.galleryId && onOpen(slot.galleryId)}
      className={cn(
        "relative w-full overflow-hidden rounded-xl razor-edge active:scale-[0.99] transition-transform group",
        aspectClass
      )}
    >
      <Image
        src={slot.url!}
        alt={slot.prompt}
        fill
        sizes="(max-width: 640px) 50vw, 320px"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function ratioToClass(r: string) {
  switch (r) {
    case "16:9":
      return "aspect-video";
    case "9:16":
      return "aspect-[9/16]";
    case "2:3":
      return "aspect-[2/3]";
    case "3:2":
      return "aspect-[3/2]";
    default:
      return "aspect-square";
  }
}

function formatChatError(status: number, fallback?: string): string {
  if (status === 401) {
    return "OpenRouter rejected the API key. Check OPENROUTER_API_KEY in .env.";
  }
  if (status === 402) {
    return "OpenRouter daily limit reached for the free tier. Add ≥$10 of credits at openrouter.ai/credits to lift the cap to 1000/day, or switch to a different chat model in Settings → Models.";
  }
  if (status === 429) {
    return "Rate-limited by OpenRouter. Wait a moment and try again.";
  }
  if (status === 503 || status === 504) {
    return "Upstream model is temporarily unavailable. Try a different model in Settings.";
  }
  return fallback || "";
}
