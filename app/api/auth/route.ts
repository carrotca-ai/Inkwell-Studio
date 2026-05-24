import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return NextResponse.json({ ok: true });

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("ns_auth", expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
