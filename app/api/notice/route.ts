import { NextResponse } from "next/server";
import { readJson, writeJson } from "../../lib/store";

export const dynamic = "force-dynamic";

const FILE = "notice.json";
type Notice = { text: string; active: boolean; until: string | null };
const EMPTY: Notice = { text: "", active: false, until: null };

export async function GET() {
  const n = await readJson<Notice>(FILE, EMPTY);
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
    const notice: Notice = { text, active, until };
    await writeJson(FILE, notice);
    return NextResponse.json({ ok: true, notice });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "সার্ভারে সমস্যা" },
      { status: 500 },
    );
  }
}