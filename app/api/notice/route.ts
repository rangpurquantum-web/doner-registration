import { NextResponse } from "next/server";
import { readJson, writeJson } from "../../lib/store";

export const dynamic = "force-dynamic";

const FILE = "notice.json";
type Notice = {
  text: string;
  active: boolean;
  until: string | null;
  link: string;
  linkLabel: string;
};
const EMPTY: Notice = {
  text: "",
  active: false,
  until: null,
  link: "",
  linkLabel: "",
};

// শুধু https/http/tel লিংক নেওয়া হয়। অন্য ধরনের লিংক খালি ফেরে।
function cleanLink(raw: unknown): string {
  const s = String(raw ?? "").trim().slice(0, 500);
  if (!s) return "";
  if (/^tel:\+?[0-9]{6,15}$/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return "";
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:"
      ? u.toString()
      : "";
  } catch {
    return "";
  }
}

export async function GET() {
  const stored = await readJson<Partial<Notice>>(FILE, EMPTY);
  const n: Notice = { ...EMPTY, ...stored };
  return NextResponse.json(n, {
    headers: {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const admin = process.env.ADMIN_KEY;
    if (!admin || String(body.key ?? "") !== admin) {
      return NextResponse.json({ error: "key ভুল" }, { status: 401 });
    }
    const text = String(body.text ?? "").trim().slice(0, 600);
    const active = Boolean(body.active) && text.length > 0;
    const hours = Number(body.hours);
    const until =
      active && hours > 0
        ? new Date(
            Date.now() + Math.min(hours, 24 * 30) * 3_600_000,
          ).toISOString()
        : null;

    const rawLink = String(body.link ?? "").trim();
    const link = cleanLink(rawLink);
    if (rawLink && !link) {
      return NextResponse.json(
        { error: "লিংকটি ঠিক নেই। https:// দিয়ে শুরু করা সঠিক লিংক দিন" },
        { status: 400 },
      );
    }
    const linkLabel = link
      ? String(body.linkLabel ?? "").trim().slice(0, 40)
      : "";

    const notice: Notice = { text, active, until, link, linkLabel };
    await writeJson(FILE, notice);
    return NextResponse.json({ ok: true, notice });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "সার্ভারে সমস্যা" },
      { status: 500 },
    );
  }
}