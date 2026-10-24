"use client";

import { useCallback, useEffect, useState } from "react";

type StockItem = { name: string; remaining: number };
type StockData = { open: boolean; items: StockItem[]; updatedAt: string };
type Tone = "ok" | "low" | "out";

const LOW_LIMIT = 5;
const REFRESH_MS = 30_000;
const MAX_DOTS = 20;

const RICE = "text-[#f3f1e8]";
const MUTED = "text-[#9db8aa]";
const serif = "[font-family:var(--font-sans-bn),system-ui,sans-serif]";

const bn = (n: number) => n.toLocaleString("bn-BD");

function toneOf(n: number): Tone {
  if (n <= 0) return "out";
  if (n <= LOW_LIMIT) return "low";
  return "ok";
}

const TONE: Record<
  Tone,
  { label: string; text: string; dot: string; badgeBg: string }
> = {
  ok: {
    label: "আছে",
    text: "text-[#9ad6b0]",
    dot: "bg-[#9ad6b0]",
    badgeBg: "bg-[#9ad6b0]/10 border-[#9ad6b0]/20",
  },
  low: {
    label: "কম আছে",
    text: "text-[#e3a83f]",
    dot: "bg-[#e3a83f]",
    badgeBg: "bg-[#e3a83f]/10 border-[#e3a83f]/20",
  },
  out: {
    label: "শেষ",
    text: "text-[#7f988b]",
    dot: "",
    badgeBg: "bg-transparent border-[#7f988b]/20",
  },
};

export default function PublicStockPage() {
  const [data, setData] = useState<StockData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/public/stock`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as StockData;
      setData(json);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const items = data
    ? [...data.items].sort((a, b) => {
        const aEnd = a.remaining <= 0 ? 1 : 0;
        const bEnd = b.remaining <= 0 ? 1 : 0;
        return aEnd - bEnd || a.name.localeCompare(b.name);
      })
    : [];

  const updated = data
    ? new Date(data.updatedAt).toLocaleTimeString("bn-BD", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Dhaka",
      })
    : null;

  const allGone = items.length > 0 && items.every((p) => p.remaining <= 0);

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-[#14372b] px-6 pb-16 pt-14">
      {/* Header */}
      <header className="pb-10">
        <div className="flex items-center justify-between">
          <p className={`text-xs uppercase tracking-[0.18em] ${MUTED}`}>
            প্রাজ্ঞ ফুড
          </p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-[#f3f1e8]/15 px-2.5 py-1 text-[11px] ${MUTED}`}
          >
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#9ad6b0] opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#9ad6b0]" />
            </span>
            লাইভ
          </span>
        </div>

        <h1
          className={`${serif} ${RICE} mt-4 text-5xl leading-[1.35] tracking-tight`}
        >
          আজকের পিঠা
        </h1>
        <p className={`mt-3 text-sm ${MUTED}`}>
          {updated ? `সর্বশেষ হালনাগাদ ${updated}-এ` : "হালনাগাদ হচ্ছে…"}
        </p>
      </header>

      {/* States */}
      {!data && !failed && (
        <section className="space-y-3 border-t border-[#f3f1e8]/15 py-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 rounded bg-[#f3f1e8]/10 motion-safe:animate-pulse" />
                <div className="h-3 w-16 rounded bg-[#f3f1e8]/10 motion-safe:animate-pulse" />
              </div>
              <div className="h-10 w-12 rounded bg-[#f3f1e8]/10 motion-safe:animate-pulse" />
            </div>
          ))}
        </section>
      )}

      {failed && !data && (
        <section className="rounded-2xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.03] p-6">
          <p className={`${serif} ${RICE} text-2xl leading-snug`}>
            স্টক আনা যায়নি
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>
            ইন্টারনেট ঠিক আছে কি না দেখুন। পেজ নিজে থেকেই আবার চেষ্টা করবে।
          </p>
        </section>
      )}

      {data && !data.open && (
        <section className="rounded-2xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.03] p-6">
          <p className={`${serif} ${RICE} text-2xl leading-snug`}>
            এখন বিক্রি বন্ধ আছে
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>
            বিক্রি শুরু হলে এখানেই পিঠার সংখ্যা দেখতে পাবেন।
          </p>
        </section>
      )}

      {data && data.open && items.length === 0 && (
        <section className="rounded-2xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.03] p-6">
          <p className={`${serif} ${RICE} text-2xl leading-snug`}>
            আজকের পিঠা এখনও যোগ হয়নি
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>
            একটু পরে আবার দেখুন।
          </p>
        </section>
      )}

      {/* List */}
      {data && data.open && items.length > 0 && (
        <>
          <ul className="space-y-3">
            {items.map((p) => {
              const tone = toneOf(p.remaining);
              const t = TONE[tone];
              const out = tone === "out";
              const dots = Math.min(p.remaining, MAX_DOTS);

              return (
                <li
                  key={p.name}
                  className={`rounded-2xl border p-5 transition-colors ${
                    out
                      ? "border-[#f3f1e8]/10 bg-[#f3f1e8]/[0.02]"
                      : "border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`${serif} text-2xl leading-snug ${
                          out
                            ? "text-[#7f988b] line-through decoration-1"
                            : RICE
                        }`}
                      >
                        {p.name}
                      </p>

                      <span
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${t.text} ${t.badgeBg}`}
                      >
                        {!out && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${t.dot}`}
                          />
                        )}
                        {t.label}
                      </span>

                      {!out && (
                        <div
                          className="mt-3 flex flex-wrap items-center gap-1.5"
                          aria-hidden
                        >
                          {Array.from({ length: dots }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-2 w-2 rounded-full ${t.dot}`}
                            />
                          ))}
                          {p.remaining > MAX_DOTS && (
                            <span className={`ml-1 text-xs ${MUTED}`}>
                              +{bn(p.remaining - MAX_DOTS)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <p
                      className={`${serif} shrink-0 text-right text-5xl leading-none tabular-nums ${
                        out ? "text-[#7f988b]" : RICE
                      }`}
                    >
                      {bn(p.remaining)}
                      <span className={`ml-1 text-base font-normal ${MUTED}`}>
                        টি
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {allGone && (
            <div className="mt-8 rounded-2xl border border-[#e3a83f]/25 bg-[#e3a83f]/[0.06] p-5">
              <p className={`${serif} ${RICE} text-xl leading-snug`}>
                আজকের সব পিঠা শেষ।
              </p>
              <p className={`mt-1 text-sm ${MUTED}`}>কাল আবার দেখা হবে।</p>
            </div>
          )}
        </>
      )}

      <p className={`mt-10 flex items-center gap-2 text-xs ${MUTED}`}>
        <span aria-hidden>↻</span>
        প্রতি ৩০ সেকেন্ডে নিজে থেকে হালনাগাদ হয়।
      </p>
    </main>
  );
}