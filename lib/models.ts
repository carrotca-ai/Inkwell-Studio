/**
 * Server-side default model IDs. Each can be overridden per-request via the
 * `model` body parameter (set in Settings on the client).
 *
 * Image / video defaults are empty because those routes use kie.ai Grok
 * Imagine via the key pool, not OpenRouter.
 */
export const MODELS = {
  chat: "openrouter/owl-alpha",
  imageQuality: "",
  imageVideo: "",
  tts: "",
} as const;

export type ModelKey = keyof typeof MODELS;
