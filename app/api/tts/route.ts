import { NextResponse } from "next/server";
import { chatCompletion, OpenRouterError } from "@/lib/openrouter";
import { MODELS } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/tts
 * body: { text: string, voice?: string, model?: string }
 * resp: { audio: string }
 *
 * TTS via the chat-completions interface. The model is asked to return audio
 * via the `audio` modality; we then extract a data:audio/...;base64 URL.
 */
export async function POST(req: Request) {
  try {
    const { text, voice, model } = (await req.json()) as {
      text?: string;
      voice?: string;
      model?: string;
    };
    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const finalModel = model?.trim() || MODELS.tts;
    if (!finalModel) {
      return NextResponse.json(
        { error: "No TTS model configured. Set one in Settings." },
        { status: 400 }
      );
    }

    const result = await chatCompletion({
      model: finalModel,
      modalities: ["audio", "text"],
      messages: [
        {
          role: "user",
          content: voice ? `Voice: ${voice}\n\n${text}` : text,
        },
      ],
    });

    const rawText = JSON.stringify(result.raw);
    const m = rawText.match(/data:audio\/[a-zA-Z0-9+\-.]+;base64,[A-Za-z0-9+/=]+/);
    if (!m) {
      return NextResponse.json(
        { error: "Model did not return any audio", debug: result.text || null },
        { status: 502 }
      );
    }
    return NextResponse.json({ audio: m[0] });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return NextResponse.json({ error: err.message, body: err.body }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
