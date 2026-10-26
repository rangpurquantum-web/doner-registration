import { put, list, del } from "@vercel/blob";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FILE = "profiles.json";
type Profile = { details: string; ingredients: string; image: string };
type Profiles = Record<string, Profile>;

async function readProfiles(): Promise<Profiles> {
  try {
    const { blobs } = await list({ prefix: FILE });
    const b = blobs.find((x) => x.pathname === FILE);
    if (!b) return {};
    const res = await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return {};
    return (await res.json()) as Profiles;
  } catch {
    return {};
  }
}

async function writeProfiles(p: Profiles) {
  await put(FILE, JSON.stringify(p), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export async function GET() {
  return NextResponse.json(await readProfiles(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const admin = process.env.ADMIN_KEY;
    if (!admin || String(form.get("key") ?? "") !== admin) {
      return NextResponse.json({ error: "key ভুল" }, { status: 401 });
    }

    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "নাম নেই" }, { status: 400 });
    }
    const details = String(form.get("details") ?? "").slice(0, 2000);
    const ingredients = String(form.get("ingredients") ?? "").slice(0, 500);

    const profiles = await readProfiles();
    const old = profiles[name];
    let image = old?.image ?? "";

    const file = form.get("image");
    if (file && typeof file !== "string" && file.size > 0) {
      if (file.size > 1_500_000) {
        return NextResponse.json(
          { error: "ছবি বড় (১.৫MB-র বেশি)" },
          { status: 413 },
        );
      }
      const blob = await put(`pitha/${Date.now()}.webp`, file, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type || "image/webp",
      });
      if (old?.image) await del(old.image).catch(() => {});
      image = blob.url;
    }

    profiles[name] = { details, ingredients, image };
    await writeProfiles(profiles);
    return NextResponse.json({ ok: true, profile: profiles[name] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "সার্ভারে সমস্যা" },
      { status: 500 },
    );
  }
}