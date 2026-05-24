import { NextResponse } from "next/server";
import { buildPool, NoKeysError, runTask, maskKey } from "@/lib/keypool";
import { KieError, uploadBase64 } from "@/lib/kie";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST /api/video — image-to-video via kie.ai grok-imagine. Polling can take ~3 min. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      image?: string;
      prompt?: string;
      aspectRatio?: string;
      duration?: string;
      resolution?: string;
      extraKeys?: string[];
    };

    if (!body.image) {
      return NextResponse.json({ error: "Source image is required" }, { status: 400 });
    }

    const pool = buildPool(body.extraKeys || []);
    if (!pool.length) {
      return NextResponse.json({ error: new NoKeysError().message }, { status: 400 });
    }

    let imageUrl: string;
    if (body.image.startsWith("data:")) {
      const uploaded = await uploadBase64(pool[0], body.image);
      imageUrl = uploaded.downloadUrl;
    } else if (/^https?:\/\//i.test(body.image)) {
      imageUrl = body.image;
    } else {
      return NextResponse.json({ error: "image must be a data URL or http(s) URL" }, { status: 400 });
    }

    const { urls, keyUsed, attempted } = await runTask(
      pool,
      "grok-imagine/image-to-video",
      {
        image_urls: [imageUrl],
        prompt: body.prompt?.trim() || "Animate with subtle, natural motion.",
        aspect_ratio: body.aspectRatio || "16:9",
        duration: body.duration || "6",
        resolution: body.resolution || "480p",
      },
      { timeoutMs: 280_000 }
    );

    if (!urls.length) {
      return NextResponse.json({ error: "Empty result from model" }, { status: 502 });
    }

    return NextResponse.json({
      video: urls[0],
      videos: urls,
      keyUsed: maskKey(keyUsed),
      attempted,
    });
  } catch (err) {
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
}
