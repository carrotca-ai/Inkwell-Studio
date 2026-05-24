import { NextResponse } from "next/server";
import { getCredits, KieError } from "@/lib/kie";
import { markCredits } from "@/lib/keypool";

export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/keys/test — checks each kie.ai key in parallel for the keys-manager UI. */
export async function POST(req: Request) {
  const { keys } = (await req.json().catch(() => ({}))) as { keys?: string[] };
  if (!Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json({ error: "keys array is required" }, { status: 400 });
  }
  if (keys.length > 200) {
    return NextResponse.json({ error: "Too many keys (max 200)" }, { status: 400 });
  }

  const results = await Promise.all(
    keys.map(async (key) => {
      try {
        const credits = await getCredits(key);
        markCredits(key, credits);
        const status: "ok" | "low" | "exhausted" =
          credits <= 0 ? "exhausted" : credits < 5 ? "low" : "ok";
        return { key, credits, status };
      } catch (err) {
        const isAuth =
          err instanceof KieError && (err.status === 401 || err.status === 403);
        return {
          key,
          status: "invalid" as const,
          error: err instanceof Error ? err.message : "Unknown error",
          authFault: isAuth,
        };
      }
    })
  );

  return NextResponse.json({ results });
}
