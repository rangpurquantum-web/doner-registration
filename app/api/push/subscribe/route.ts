import { NextResponse } from "next/server";
import { readJson, writeJson, subsFile } from "../../../lib/store";

export const dynamic = "force-dynamic";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function POST(req: Request) {
  try {
    if (!process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "নোটিফিকেশন এখনো চালু করা হয়নি" },
        { status: 503 },
      );
    }
    const b = await req.json().catch(() => null);
    const endpoint = String(b?.endpoint ?? "");
    const p256dh = String(b?.keys?.p256dh ?? "");
    const auth = String(b?.keys?.auth ?? "");
    if (
      !endpoint.startsWith("https://") ||
      endpoint.length > 1000 ||
      !p256dh ||
      p256dh.length > 200 ||
      !auth ||
      auth.length > 100
    ) {
      return NextResponse.json({ error: "ভুল তথ্য" }, { status: 400 });
    }
    const file = subsFile();
    const subs = await readJson<Sub[]>(file, []);
    if (!subs.some((s) => s.endpoint === endpoint)) {
      if (subs.length >= 5000) {
        return NextResponse.json({ error: "সীমা শেষ" }, { status: 429 });
      }
      subs.push({ endpoint, keys: { p256dh, auth } });
      await writeJson(file, subs);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "সার্ভারে সমস্যা" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    const endpoint = String(b?.endpoint ?? "");
    if (!endpoint) return NextResponse.json({ ok: true });
    const file = subsFile();
    const subs = await readJson<Sub[]>(file, []);
    const next = subs.filter((s) => s.endpoint !== endpoint);
    if (next.length !== subs.length) await writeJson(file, next);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}