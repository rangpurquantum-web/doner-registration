import { put, list } from "@vercel/blob";
import { createHash } from "crypto";

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const { blobs } = await list({ prefix: file });
    const b = blobs.find((x) => x.pathname === file);
    if (!b) return fallback;
    const res = await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, data: unknown) {
  await put(file, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

// সাবস্ক্রিপশনের ফাইলের নাম গোপন চাবি থেকে বানানো, যাতে বাইরের কেউ অনুমান করতে না পারে
export function subsFile() {
  const h = createHash("sha256")
    .update(`push:${process.env.VAPID_PRIVATE_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 24);
  return `push-subs-${h}.json`;
}