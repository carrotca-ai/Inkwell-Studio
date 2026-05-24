/**
 * Thin wrapper around the OpenRouter REST API (OpenAI-compatible
 * /chat/completions). Normalizes both string and content-array responses, and
 * extracts inline image URLs when the model is multimodal.
 */

const BASE_URL = "https://openrouter.ai/api/v1";

export class OpenRouterError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
    this.body = body;
  }
}

function apiKey() {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) throw new OpenRouterError("OPENROUTER_API_KEY is not set", 500, null);
  return k;
}

function headers() {
  return {
    Authorization: `Bearer ${apiKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "Inkwell Studio",
  };
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

export type ChatCompletionOptions = {
  model: string;
  messages: ChatMessage[];
  modalities?: ("text" | "image" | "audio")[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  extra?: Record<string, unknown>;
};

export type ChatCompletionResult = {
  text: string;
  images: string[];
  raw: unknown;
};

export async function chatCompletion(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    ...(opts.modalities ? { modalities: opts.modalities } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.max_tokens !== undefined ? { max_tokens: opts.max_tokens } : {}),
    ...(opts.extra || {}),
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (json as { error?: { message?: string } })?.error?.message ||
      `OpenRouter request failed (${res.status})`;
    throw new OpenRouterError(message, res.status, json);
  }

  return normalizeChatResponse(json);
}

function normalizeChatResponse(json: unknown): ChatCompletionResult {
  const choice =
    (json as { choices?: Array<{ message?: unknown }> })?.choices?.[0]?.message ?? {};
  const msg = choice as {
    content?: string | ContentPart[];
    images?: Array<{ image_url?: { url?: string } } | string>;
  };

  let text = "";
  const images: string[] = [];

  if (typeof msg.content === "string") {
    text = msg.content;
    images.push(...extractDataUrls(msg.content));
  } else if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part.type === "text") text += part.text;
      else if (part.type === "image_url" && part.image_url?.url) images.push(part.image_url.url);
    }
  }

  if (Array.isArray(msg.images)) {
    for (const img of msg.images) {
      if (typeof img === "string") images.push(img);
      else if (img?.image_url?.url) images.push(img.image_url.url);
    }
  }

  return { text: text.trim(), images: dedupe(images), raw: json };
}

function extractDataUrls(text: string): string[] {
  const re = /data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/g;
  return text.match(re) ?? [];
}

function dedupe(arr: string[]) {
  return [...new Set(arr)];
}
