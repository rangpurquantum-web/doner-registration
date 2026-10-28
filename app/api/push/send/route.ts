import webpush from "web-push";
import { NextResponse } from "next/server";
import { readJson, writeJson, subsFile } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

function authed(key: unknown) {
  const admin = process.env.ADMIN_KEY;
  return !!admin && String(key ?? "") === admin;
}

export async function GET(req: Request) {
  if (!authed(new URL(req.url).searchParams.get("key"))) {
    return NextResponse.json({ error: "key ভুল" }, { status: 401 });
  }
  const subs = await readJson<Sub[]>(subsFile(), []);
  return NextResponse.json({ count: subs.length });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!authed(body.key)) {
      return NextResponse.json({ error: "key ভুল" }, { status: 401 });
    }

    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!pub || !priv || !subject) {
      return NextResponse.json(
        { error: "VAPID কী সেট করা নেই" },
        { status: 500 },
      );
    }

    const title =
      String(body.title ?? "").trim().slice(0, 80) || "আজকের পিঠা";
    const text = String(body.body ?? "").trim().slice(0, 200);
    if (!text) {
      return NextResponse.json({ error: "মেসেজ লিখুন" }, { status: 400 });
    }
    const url =
      typeof body.url === "string" && body.url.startsWith("/")
        ? body.url
        : "/";

    webpush.setVapidDetails(subject, pub, priv);

    const file = subsFile();
    const subs = await readJson<Sub[]>(file, []);
    const payload = JSON.stringify({ title, body: text, url });
    const dead = new Set<string>();
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < subs.length; i += 50) {
      const chunk = subs.slice(i, i + 50);
      const results = await Promise.allSettled(
        chunk.map((s) =>
          webpush.sendNotification(s, payload, { TTL: 7200 }),
        ),
      );
      results.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          sent++;
        } else {
          failed++;
          const code = (r.reason as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) dead.add(chunk[idx].endpoint);
        }
      });
    }

    if (dead.size > 0) {
      await writeJson(
        file,
        subs.filter((s) => !dead.has(s.endpoint)),
      );
    }
    return NextResponse.json({ ok: true, sent, failed, removed: dead.size });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "সার্ভারে সমস্যা" },
      { status: 500 },
    );
  }
}