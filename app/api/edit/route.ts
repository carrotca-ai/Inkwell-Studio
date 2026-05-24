import { NextResponse } from "next/server";
import { buildPool, NoKeysError, runTask, maskKey } from "@/lib/keypool";
import { KieError, uploadBase64 } from "@/lib/kie";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/edit — image-to-image via kie.ai grok-imagine.
 * Data-URL inputs are uploaded to kie.ai's CDN first, then the edit task runs
 * on the public URL. Auth/quota/rate failures rotate to the next key.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      prompt?: string;
      image?: string;
      aspectRatio?: string;
      quality?: boolean;
      extraKeys?: string[];
    };

    const prompt = body.prompt?.trim();
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    if (!body.image) return NextResponse.json({ error: "Source image is required" }, { status: 400 });

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
      "grok-imagine/image-to-image",
      {
        prompt,
        image_urls: [imageUrl],
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
