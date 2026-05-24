import { NextResponse } from "next/server";
import { buildPool, NoKeysError, runTask, maskKey } from "@/lib/keypool";
import { KieError } from "@/lib/kie";

export const runtime = "nodejs";
export const maxDuration = 120;

/** POST /api/generate — text-to-image via kie.ai grok-imagine with key rotation. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      prompt?: string;
      aspectRatio?: string;
      quality?: boolean;
      extraKeys?: string[];
    };

    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const pool = buildPool(body.extraKeys || []);

    const { urls, keyUsed, attempted } = await runTask(
      pool,
      "grok-imagine/text-to-image",
      {
        prompt,
        aspect_ratio: body.aspectRatio || "1:1",
        enable_pro: body.quality !== false,
        nsfw_checker: false,
      }
    );

    if (!urls.length) {
      return NextResponse.json({ error: "Empty result from model" }, { status: 502 });
    }

    return NextResponse.json({
      image: urls[0],
      images: urls,
      keyUsed: maskKey(keyUsed),
      attempted,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof NoKeysError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof KieError) {
    return NextResponse.json({ error: err.message, body: err.body }, { status: err.status });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal error";
  return NextResponse.json({ error: message }, { status: 500 });
}
